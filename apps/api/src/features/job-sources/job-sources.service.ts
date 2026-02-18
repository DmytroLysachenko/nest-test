import { randomUUID } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { careerProfilesTable, jobOffersTable, jobSourceCallbackEventsTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';
import type { JobSourceRunStatus } from '@repo/db';
import { buildPracujListingUrl, normalizePracujFilters, type PracujSourceKind } from '@repo/db';

import type { Env } from '@/config/env';
import { Drizzle } from '@/common/decorators';
import { JobOffersService } from '@/features/job-offers/job-offers.service';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';

type CallbackJobPayload = NonNullable<ScrapeCompleteDto['jobs']>[number];

const mapSource = (source: string) => {
  if (source === 'pracuj-pl' || source === 'pracuj-pl-it' || source === 'pracuj-pl-general') {
    return 'PRACUJ_PL' as const;
  }
  throw new BadRequestException(`Unsupported source: ${source}`);
};

const normalizeCompletionStatus = (dto: ScrapeCompleteDto) => dto.status ?? 'COMPLETED';

const normalizeString = (value: string | undefined | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const sanitizeStringArray = (value: string[] | undefined | null) =>
  Array.from(
    new Set(
      (value ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const sanitizeCallbackJobs = (jobs: ScrapeCompleteDto['jobs']) => {
  if (!jobs?.length) {
    return [];
  }

  const dedupByUrl = new Map<string, CallbackJobPayload>();
  for (const job of jobs) {
    const url = normalizeString(job.url);
    const title = normalizeString(job.title);
    const description = normalizeString(job.description);
    if (!url || !title || !description) {
      continue;
    }
    dedupByUrl.set(url.toLowerCase(), {
      ...job,
      url,
      title,
      description,
      source: normalizeString(job.source) ?? undefined,
      sourceId: normalizeString(job.sourceId) ?? undefined,
      company: normalizeString(job.company) ?? undefined,
      location: normalizeString(job.location) ?? undefined,
      salary: normalizeString(job.salary) ?? undefined,
      employmentType: normalizeString(job.employmentType) ?? undefined,
      requirements: sanitizeStringArray(job.requirements),
      tags: sanitizeStringArray(job.tags),
    });
  }

  return Array.from(dedupByUrl.values());
};

const deriveFailureType = (error?: string | null) => {
  const normalized = (error ?? '').toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes('[timeout]') || normalized.includes('timed out')) {
    return 'timeout';
  }
  if (normalized.includes('[network]') || normalized.includes('cloudflare') || normalized.includes('fetch')) {
    return 'network';
  }
  if (normalized.includes('[validation]') || normalized.includes('invalid') || normalized.includes('required')) {
    return 'validation';
  }
  if (normalized.includes('[parse]') || normalized.includes('parse')) {
    return 'parse';
  }
  if (normalized.includes('[callback]') || normalized.includes('callback')) {
    return 'callback';
  }
  return 'unknown';
};

@Injectable()
export class JobSourcesService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
    @Optional() private readonly jobOffersService?: JobOffersService,
  ) {}

  async enqueueScrape(userId: string, dto: EnqueueScrapeDto, incomingRequestId?: string) {
    const requestId = incomingRequestId?.trim() || randomUUID();
    const source = (dto.source ?? 'pracuj-pl-it') as PracujSourceKind;
    const sourceEnum = mapSource(source);
    const normalizedFiltersResult = normalizePracujFilters(source, (dto.filters as ScrapeFiltersDto | undefined) ?? undefined);
    const normalizedFilters = Object.keys(normalizedFiltersResult.filters).length
      ? normalizedFiltersResult.filters
      : undefined;
    const listingUrl = dto.listingUrl ?? (normalizedFilters ? buildPracujListingUrl(source, normalizedFilters) : undefined);

    if (!listingUrl) {
      throw new BadRequestException('Provide listingUrl or filters');
    }

    const careerProfileId = dto.careerProfileId ?? (await this.getActiveCareerProfileId(userId));
    if (!careerProfileId) {
      throw new NotFoundException('Active career profile not found');
    }

    const [run] = await this.db
      .insert(jobSourceRunsTable)
      .values({
        source: sourceEnum,
        userId,
        careerProfileId,
        listingUrl,
        filters: normalizedFilters ?? null,
        status: 'PENDING',
        startedAt: new Date(),
      })
      .returning({
        id: jobSourceRunsTable.id,
        createdAt: jobSourceRunsTable.createdAt,
      });

    if (!run?.id) {
      throw new ServiceUnavailableException('Failed to create scrape run');
    }

    const workerUrl = this.configService.get('WORKER_TASK_URL', { infer: true });
    const authToken = this.configService.get('WORKER_AUTH_TOKEN', { infer: true });
    const callbackUrl = this.resolveWorkerCallbackUrl();
    const callbackToken = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (!workerUrl) {
      await this.markRunFailed(run.id, 'Worker task URL is not configured');
      throw new ServiceUnavailableException('Worker task URL is not configured');
    }

    const timeoutMs = this.configService.get('WORKER_REQUEST_TIMEOUT_MS', { infer: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          source,
          sourceRunId: run.id,
          requestId,
          callbackUrl,
          callbackToken,
          listingUrl,
          limit: dto.limit,
          userId,
          careerProfileId,
          filters: normalizedFilters,
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        const reason = `Worker rejected request: ${text}`;
        await this.markRunFailed(run.id, reason);
        throw new ServiceUnavailableException(reason);
      }

      const payload = text ? JSON.parse(text) : { ok: true };
      await this.markRunRunning(run.id);
      this.logger.log({ requestId, sourceRunId: run.id, userId }, 'Scrape run accepted by worker');
      if (Object.keys(normalizedFiltersResult.dropped).length > 0) {
        this.logger.warn(
          { requestId, sourceRunId: run.id, droppedFilters: normalizedFiltersResult.dropped },
          'Some scrape filters were dropped because they are unsupported for this source',
        );
      }

      return {
        ...payload,
        sourceRunId: run.id,
        status: 'accepted',
        acceptedAt: (run.createdAt ?? new Date()).toISOString(),
        droppedFilters: normalizedFiltersResult.dropped,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        await this.markRunRunning(run.id);
        this.logger.warn({ requestId, sourceRunId: run.id, userId }, 'Worker response timed out');
        return {
          ok: true,
          sourceRunId: run.id,
          status: 'accepted',
          acceptedAt: (run.createdAt ?? new Date()).toISOString(),
          warning: 'Worker response timed out. Scrape continues in background.',
        };
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async completeScrape(
    dto: ScrapeCompleteDto,
    authorization?: string,
    requestId?: string,
    workerSignature?: string,
    workerTimestamp?: string,
  ) {
    this.verifyWorkerCallbackSignature(dto, requestId, workerSignature, workerTimestamp);
    const callbackEventId = dto.eventId?.trim() || null;

    const token = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (token) {
      const header = authorization ?? '';
      if (header !== `Bearer ${token}`) {
        throw new UnauthorizedException('Invalid worker callback token');
      }
    }

    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        source: jobSourceRunsTable.source,
        userId: jobSourceRunsTable.userId,
        careerProfileId: jobSourceRunsTable.careerProfileId,
        status: jobSourceRunsTable.status,
        totalFound: jobSourceRunsTable.totalFound,
        scrapedCount: jobSourceRunsTable.scrapedCount,
        startedAt: jobSourceRunsTable.startedAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, dto.sourceRunId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    if (callbackEventId) {
      const accepted = await this.registerCallbackEvent(run.id, callbackEventId, dto, requestId);
      if (!accepted) {
        this.logger.log(
          { requestId, sourceRunId: run.id, eventId: callbackEventId, idempotent: true },
          'Duplicate callback event ignored',
        );
        return {
          ok: true,
          status: run.status,
          inserted: 0,
          idempotent: true,
          warning: 'Duplicate callback event ignored',
        };
      }
    }

    const status = normalizeCompletionStatus(dto);
    if (status === 'FAILED' && !dto.error?.trim()) {
      throw new BadRequestException('Failed callback must include error');
    }
    if (status === 'FAILED' && dto.jobs?.length) {
      throw new BadRequestException('Failed callback cannot include jobs payload');
    }
    if (status === 'COMPLETED' && dto.error?.trim()) {
      throw new BadRequestException('Completed callback cannot include error');
    }
    if (dto.scrapedCount !== undefined && dto.jobCount !== undefined && dto.scrapedCount !== dto.jobCount) {
      throw new BadRequestException('scrapedCount and jobCount mismatch');
    }
    if (dto.jobs?.length && dto.scrapedCount !== undefined && dto.jobs.length !== dto.scrapedCount) {
      throw new BadRequestException('scrapedCount must match jobs payload length');
    }

    const sanitizedJobs = sanitizeCallbackJobs(dto.jobs);

    const statusFrom = run.status;
    const isTerminal = run.status === 'COMPLETED' || run.status === 'FAILED';
    if (isTerminal && run.status === status) {
      this.logger.log(
        { requestId, sourceRunId: run.id, statusFrom, statusTo: status, idempotent: true },
        'Scrape callback ignored because run is already finalized',
      );
      return {
        ok: true,
        status: run.status,
        inserted: 0,
        idempotent: true,
      };
    }
    if (isTerminal && run.status !== status) {
      this.logger.warn(
        { requestId, sourceRunId: run.id, statusFrom, statusTo: status, idempotent: true },
        'Scrape callback attempted conflicting terminal status',
      );
      return {
        ok: true,
        status: run.status,
        inserted: 0,
        idempotent: true,
        warning: `Run already finalized as ${run.status}`,
      };
    }

    const scrapedCount =
      (sanitizedJobs.length ? sanitizedJobs.length : undefined) ??
      dto.scrapedCount ??
      dto.jobCount ??
      run.scrapedCount ??
      0;
    const totalFound = dto.totalFound ?? dto.jobLinkCount ?? run.totalFound ?? null;

    if (status === 'FAILED') {
      const completedAt = new Date();
      await this.db
        .update(jobSourceRunsTable)
        .set({
          status: 'FAILED',
          scrapedCount,
          totalFound,
          error: dto.error ?? 'Scrape failed in worker',
          completedAt,
        })
        .where(eq(jobSourceRunsTable.id, run.id));
      this.logger.warn(
        {
          requestId,
          sourceRunId: run.id,
          statusFrom,
          statusTo: 'FAILED',
          failureType: deriveFailureType(dto.error),
          totalFound,
          scrapedCount,
          durationMs: this.resolveRunDurationMs(run.startedAt ?? null, completedAt),
        },
        'Scrape run finalized as FAILED',
      );

      return {
        ok: true,
        status: 'FAILED',
        inserted: 0,
        idempotent: run.status === 'FAILED',
      };
    }

    if (sanitizedJobs.length) {
      await this.db
        .insert(jobOffersTable)
        .values(
          sanitizedJobs.map((job) => ({
            source: run.source,
            sourceId: job.sourceId ?? null,
            runId: run.id,
            url: job.url,
            title: job.title,
            company: job.company ?? null,
            location: job.location ?? null,
            salary: job.salary ?? null,
            employmentType: job.employmentType ?? null,
            description: job.description,
            requirements: job.requirements?.length ? job.requirements : null,
            details: job.details ?? null,
            fetchedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: [jobOffersTable.source, jobOffersTable.url],
          set: {
            runId: run.id,
            sourceId: sql`excluded."source_id"`,
            title: sql`excluded."title"`,
            company: sql`excluded."company"`,
            location: sql`excluded."location"`,
            salary: sql`excluded."salary"`,
            employmentType: sql`excluded."employment_type"`,
            description: sql`excluded."description"`,
            requirements: sql`excluded."requirements"`,
            details: sql`excluded."details"`,
            fetchedAt: new Date(),
          },
        });
    }

    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'COMPLETED',
        scrapedCount,
        totalFound,
        error: null,
        completedAt: new Date(),
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    if (!run.userId || !run.careerProfileId) {
      return {
        ok: true,
        status: 'COMPLETED',
        inserted: 0,
        idempotent: true,
        warning: 'Job source run is missing user context',
      };
    }

    const offers = await this.db
      .select({ id: jobOffersTable.id })
      .from(jobOffersTable)
      .where(eq(jobOffersTable.runId, run.id));

    if (!offers.length) {
      return {
        ok: true,
        status: 'COMPLETED',
        inserted: 0,
        totalOffers: 0,
        idempotent: true,
      };
    }

    const inserted = await this.db
      .insert(userJobOffersTable)
      .values(
        offers.map((offer) => ({
          userId: run.userId!,
          careerProfileId: run.careerProfileId!,
          jobOfferId: offer.id,
          sourceRunId: run.id,
          statusHistory: [{ status: 'NEW', changedAt: new Date().toISOString() }],
          lastStatusAt: new Date(),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: userJobOffersTable.id });

    void this.autoScoreIngestedOffers(run.userId, run.id, inserted.map((entry) => entry.id));

    this.logger.log(
      {
        requestId,
        sourceRunId: run.id,
        statusFrom,
        statusTo: 'COMPLETED',
        totalFound,
        scrapedCount,
        offersInserted: inserted.length,
      },
      'Scrape run finalized as COMPLETED',
    );

    return {
      ok: true,
      status: 'COMPLETED',
      inserted: inserted.length,
      totalOffers: offers.length,
      idempotent: inserted.length === 0,
    };
  }

  private verifyWorkerCallbackSignature(
    dto: ScrapeCompleteDto,
    requestId: string | undefined,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
  ) {
    const signingSecret = this.configService.get('WORKER_CALLBACK_SIGNING_SECRET', { infer: true });
    if (!signingSecret) {
      return;
    }

    if (!signatureHeader || !timestampHeader) {
      throw new UnauthorizedException('Missing worker callback signature headers');
    }
    if (!dto.eventId?.trim()) {
      throw new UnauthorizedException('Missing worker callback event id');
    }

    const timestampSec = Number(timestampHeader);
    if (!Number.isFinite(timestampSec)) {
      throw new UnauthorizedException('Invalid worker callback signature timestamp');
    }

    const tolerance = this.configService.get('WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC', { infer: true });
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > tolerance) {
      throw new UnauthorizedException('Expired worker callback signature timestamp');
    }

    const status = dto.status ?? 'COMPLETED';
    const eventId = dto.eventId ?? '';
    const base = `${timestampSec}.${dto.sourceRunId}.${status}.${dto.runId ?? ''}.${requestId ?? ''}.${eventId}`;
    const expected = createHmac('sha256', signingSecret).update(base).digest('hex');
    if (!this.constantTimeEqual(signatureHeader, expected)) {
      throw new UnauthorizedException('Invalid worker callback signature');
    }
  }

  private constantTimeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  }

  async listRuns(userId: string, query: ListJobSourceRunsQuery) {
    const conditions = [eq(jobSourceRunsTable.userId, userId)];
    if (query.status) {
      conditions.push(eq(jobSourceRunsTable.status, query.status as JobSourceRunStatus));
    }

    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;

    const items = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(...conditions))
      .orderBy(desc(jobSourceRunsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(jobSourceRunsTable)
      .where(and(...conditions));

    return {
      items,
      total: Number(total ?? 0),
    };
  }

  async getRun(userId: string, runId: string) {
    const run = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    return {
      ...run,
      finalizedAt: run.completedAt,
      failureType: deriveFailureType(run.error),
    };
  }

  private async getActiveCareerProfileId(userId: string) {
    const [profile] = await this.db
      .select({ id: careerProfilesTable.id })
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1);

    return profile?.id ?? null;
  }

  private resolveWorkerCallbackUrl() {
    const configured = this.configService.get('WORKER_CALLBACK_URL', { infer: true });
    if (configured) {
      return configured;
    }

    const host = this.configService.get('HOST', { infer: true }) ?? 'localhost';
    const port = this.configService.get('PORT', { infer: true }) ?? 3000;
    const prefix = this.configService.get('API_PREFIX', { infer: true }) ?? 'api';
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return `http://${host}:${port}/${normalizedPrefix}/job-sources/complete`;
  }

  private async markRunFailed(runId: string, error: string) {
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'FAILED',
        error,
        completedAt: new Date(),
      })
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.status, 'PENDING')));
  }

  private async markRunRunning(runId: string) {
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'RUNNING',
        error: null,
      })
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.status, 'PENDING')));
  }

  private resolveRunDurationMs(startedAt: Date | null, completedAt: Date) {
    if (!startedAt) {
      return null;
    }
    return Math.max(0, completedAt.getTime() - startedAt.getTime());
  }

  private async registerCallbackEvent(
    sourceRunId: string,
    eventId: string,
    dto: ScrapeCompleteDto,
    requestId?: string,
  ) {
    const status = dto.status ?? 'COMPLETED';
    const payload = JSON.stringify({
      status,
      runId: dto.runId,
      error: dto.error,
      jobCount: dto.jobs?.length ?? dto.scrapedCount ?? dto.jobCount ?? 0,
    });

    const inserted = await this.db
      .insert(jobSourceCallbackEventsTable)
      .values({
        sourceRunId,
        eventId,
        requestId: requestId ?? null,
        status,
        payload,
      })
      .onConflictDoNothing()
      .returning({ id: jobSourceCallbackEventsTable.id });

    return inserted.length > 0;
  }

  private async autoScoreIngestedOffers(userId: string, sourceRunId: string, userOfferIds: string[]) {
    if (!userOfferIds.length) {
      return;
    }

    const enabled = this.configService.get('AUTO_SCORE_ON_INGEST', { infer: true });
    if (!enabled) {
      return;
    }
    if (!this.jobOffersService) {
      this.logger.warn({ userId, userOfferCount: userOfferIds.length }, 'JobOffersService unavailable, skipping auto-score');
      return;
    }

    const concurrency = this.configService.get('AUTO_SCORE_CONCURRENCY', { infer: true });
    const minScore = this.configService.get('AUTO_SCORE_MIN_SCORE', { infer: true });
    const retryAttempts = this.configService.get('AUTO_SCORE_RETRY_ATTEMPTS', { infer: true });
    let attempted = 0;
    let scored = 0;
    let failed = 0;
    let retried = 0;
    const queue = [...userOfferIds];
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (queue.length) {
        const nextId = queue.shift();
        if (!nextId) {
          continue;
        }
        attempted += 1;

        let success = false;
        for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
          try {
            await this.jobOffersService.scoreOffer(userId, nextId, minScore);
            scored += 1;
            success = true;
            break;
          } catch (error) {
            if (attempt < retryAttempts) {
              retried += 1;
            }
            this.logger.warn(
              {
                userId,
                sourceRunId,
                userOfferId: nextId,
                attempt,
                retryAttempts,
                error: error instanceof Error ? error.message : String(error),
              },
              'Auto-score attempt failed for ingested offer',
            );
          }
        }

        if (!success) {
          failed += 1;
        }
      }
    });

    await Promise.all(workers);
    this.logger.log(
      {
        userId,
        sourceRunId,
        userOfferCount: userOfferIds.length,
        attempted,
        scored,
        failed,
        retried,
        concurrency,
        minScore,
        retryAttempts,
      },
      'Auto-score completed for ingested offers',
    );
  }
}

import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { careerProfilesTable, jobOffersTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';
import type { JobSourceRunStatus } from '@repo/db';

import type { Env } from '@/config/env';
import { Drizzle } from '@/common/decorators';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';

const buildListingUrl = (filters: ScrapeFiltersDto, source: string) => {
  const resolvePublishedPath = (days: number) => {
    if (days === 1) {
      return 'ostatnich 24h;p,1';
    }
    return `ostatnich ${days} dni;p,${days}`;
  };

  const segments: string[] = [];
  if (filters.keywords) {
    segments.push(`${encodeURIComponent(filters.keywords)};kw`);
  } else if (filters.location) {
    segments.push(`${encodeURIComponent(filters.location)};wp`);
  }

  if (filters.publishedWithinDays) {
    segments.push(resolvePublishedPath(filters.publishedWithinDays));
  }

  const baseHost = source === 'pracuj-pl-general' ? 'https://www.pracuj.pl/praca' : 'https://it.pracuj.pl/praca';
  const base = `${baseHost}${segments.length ? `/${segments.join('/')}` : ''}`;
  const url = new URL(base);
  const params = url.searchParams;

  if (filters.specializations?.length) {
    params.set('its', filters.specializations.join(','));
  }
  if (filters.technologies?.length) {
    params.set('itth', filters.technologies.join(','));
  }
  if (filters.categories?.length) {
    params.set('cc', filters.categories.join(','));
  }
  if (filters.workModes?.length) {
    params.set('wm', filters.workModes.join(','));
  }
  if (filters.workDimensions?.length) {
    params.set('ws', filters.workDimensions.join(','));
  }
  const positionLevels = filters.positionLevels ?? filters.employmentTypes ?? filters.experienceLevels;
  if (positionLevels?.length) {
    params.set('et', positionLevels.join(','));
  }
  if (filters.contractTypes?.length) {
    params.set('tc', filters.contractTypes.join(','));
  }
  if (filters.salaryMin) {
    params.set('sal', String(filters.salaryMin));
  }
  if (filters.radiusKm) {
    params.set('rd', String(filters.radiusKm));
  }
  if (filters.onlyWithProjectDescription) {
    params.set('ap', 'true');
  }
  if (filters.onlyEmployerOffers) {
    params.set('ao', 'false');
  }
  if (filters.ukrainiansWelcome) {
    params.set('ua', 'true');
  }
  if (filters.noPolishRequired) {
    params.set('wpl', 'true');
  }
  if (filters.keywords && filters.location) {
    params.set('wp', filters.location);
  }

  return url.toString();
};

const mapSource = (source: string) => {
  if (source === 'pracuj-pl' || source === 'pracuj-pl-it' || source === 'pracuj-pl-general') {
    return 'PRACUJ_PL' as const;
  }
  throw new BadRequestException(`Unsupported source: ${source}`);
};

const normalizeCompletionStatus = (dto: ScrapeCompleteDto) => dto.status ?? 'COMPLETED';
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
  ) {}

  async enqueueScrape(userId: string, dto: EnqueueScrapeDto, incomingRequestId?: string) {
    const requestId = incomingRequestId?.trim() || randomUUID();
    const source = dto.source ?? 'pracuj-pl-it';
    const sourceEnum = mapSource(source);
    const listingUrl = dto.listingUrl ?? (dto.filters ? buildListingUrl(dto.filters, source) : undefined);

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
        filters: dto.filters ?? null,
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
          filters: dto.filters,
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

      return {
        ...payload,
        sourceRunId: run.id,
        status: 'accepted',
        acceptedAt: (run.createdAt ?? new Date()).toISOString(),
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

  async completeScrape(dto: ScrapeCompleteDto, authorization?: string, requestId?: string) {
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

    const status = normalizeCompletionStatus(dto);
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

    const scrapedCount = dto.scrapedCount ?? dto.jobCount ?? dto.jobs?.length ?? run.scrapedCount ?? 0;
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

    if (dto.jobs?.length) {
      await this.db
        .insert(jobOffersTable)
        .values(
          dto.jobs.map((job) => ({
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
            requirements: job.requirements ?? null,
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
}

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from 'nestjs-pino';
import {
  careerProfilesTable,
  jobOffersTable,
  jobSourceCallbackEventsTable,
  jobSourceRunsTable,
  userJobOffersTable,
} from '@repo/db';
import type { JobSourceRunStatus } from '@repo/db';
import { buildPracujListingUrl, normalizePracujFilters, type PracujSourceKind } from '@repo/db';

import type { Env } from '@/config/env';
import { Drizzle } from '@/common/decorators';
import { JobOffersService } from '@/features/job-offers/job-offers.service';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';
import { ScrapeHeartbeatDto } from './dto/scrape-heartbeat.dto';
import { buildFiltersFromProfile, inferPracujSource } from './scrape-request-resolver';
import { parseCandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';
import { RunDiagnosticsSummaryCache } from './run-diagnostics-summary-cache';

type CallbackJobPayload = NonNullable<ScrapeCompleteDto['jobs']>[number];
type RunFailureType = 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown';
type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type WorkerSignaturePayload = {
  sourceRunId: string;
  status: string;
  runId?: string;
  eventId?: string;
};

const ALLOWED_STATUS_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  PENDING: ['RUNNING', 'FAILED'],
  RUNNING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

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
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

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

const toRunFailureType = (value?: string | null): RunFailureType | null => {
  if (!value) {
    return null;
  }
  if (value === 'timeout' || value === 'network' || value === 'validation' || value === 'parse' || value === 'callback') {
    return value;
  }
  return 'unknown';
};

const mapSourceEnumToSlug = (source: string) => {
  if (source === 'PRACUJ_PL') {
    return 'pracuj-pl' as const;
  }
  throw new BadRequestException(`Unsupported source enum: ${source}`);
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
};

const stableJson = (value: unknown) => JSON.stringify(canonicalize(value ?? null));
const workerOidcClient = new OAuth2Client();

@Injectable()
export class JobSourcesService {
  private readonly diagnosticsSummaryCache = new RunDiagnosticsSummaryCache<any>(30000);
  private readonly enqueueIdempotencyWindow = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
    @Optional() private readonly jobOffersService?: JobOffersService,
  ) {}

  async enqueueScrape(userId: string, dto: EnqueueScrapeDto, incomingRequestId?: string) {
    await this.reconcileStaleRuns(userId);
    const requestId = incomingRequestId?.trim() || randomUUID();
    const profileContext = await this.getCareerProfileContext(userId, dto.careerProfileId);
    if (!profileContext?.careerProfileId) {
      throw new NotFoundException('Active career profile not found');
    }
    const careerProfileId = profileContext.careerProfileId;
    const inferredSource = profileContext.profile ? inferPracujSource(profileContext.profile) : 'pracuj-pl-it';
    const source = (dto.source ?? inferredSource) as PracujSourceKind;
    const sourceEnum = mapSource(source);
    const maxActiveRuns = this.configService.get('SCRAPE_MAX_ACTIVE_RUNS_PER_USER', { infer: true });
    if (typeof maxActiveRuns === 'number' && maxActiveRuns > 0) {
      const activeRunsResult = await this.db
        .select({ value: count() })
        .from(jobSourceRunsTable)
        .where(and(eq(jobSourceRunsTable.userId, userId), inArray(jobSourceRunsTable.status, ['PENDING', 'RUNNING'])));
      const [activeRuns] = Array.isArray(activeRunsResult) ? activeRunsResult : [];
      const activeRunCount = Number(activeRuns?.value ?? 0);
      if (activeRunCount >= maxActiveRuns) {
        throw new HttpException(
          `Too many active scrape runs (${activeRunCount}/${maxActiveRuns}). Wait for completion or retry later.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const profileDerivedFilters = dto.filters
      ? undefined
      : profileContext.profile
        ? buildFiltersFromProfile(profileContext.profile)
        : undefined;
    const rawFilters = (dto.filters as ScrapeFiltersDto | undefined) ?? profileDerivedFilters;
    const normalizedFiltersResult = normalizePracujFilters(source, rawFilters);
    const normalizedFilters = Object.keys(normalizedFiltersResult.filters).length
      ? normalizedFiltersResult.filters
      : undefined;
    const listingUrl =
      dto.listingUrl ?? (normalizedFilters ? buildPracujListingUrl(source, normalizedFilters) : undefined);

    if (!listingUrl) {
      throw new BadRequestException('Provide listingUrl, explicit filters, or profile input preferences');
    }
    this.assertListingUrlAllowed(source, listingUrl);

    const intentFingerprint = this.computeIntentFingerprint(source, listingUrl, normalizedFilters ?? null);
    const resolvedFromProfile = !dto.filters && !dto.source && Boolean(profileContext.profile);
    if (this.shouldSuppressDuplicateEnqueue(userId, intentFingerprint)) {
      throw new HttpException(
        'Duplicate scrape enqueue detected for the same intent. Retry after a short delay.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!dto.forceRefresh) {
      const reuse = await this.tryReuseFromDatabase({
        userId,
        careerProfileId,
        source: sourceEnum,
        listingUrl,
        normalizedFilters: normalizedFilters ?? null,
        intentFingerprint,
        limit: dto.limit,
      });

      if (reuse) {
        this.logger.log(
          {
            requestId,
            sourceRunId: reuse.sourceRunId,
            reusedFromRunId: reuse.reusedFromRunId,
            linkedOffers: reuse.inserted,
            totalOffers: reuse.totalOffers,
          },
          'Scrape request served from database cache',
        );

        return {
          ok: true,
          sourceRunId: reuse.sourceRunId,
          status: 'reused',
          acceptedAt: reuse.acceptedAt,
          inserted: reuse.inserted,
          totalOffers: reuse.totalOffers,
          reusedFromRunId: reuse.reusedFromRunId,
          intentFingerprint,
          resolvedFromProfile,
          droppedFilters: normalizedFiltersResult.dropped,
          acceptedFilters: normalizedFilters ?? null,
        };
      }
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
    const heartbeatUrl = this.resolveWorkerHeartbeatUrl(run.id);
    const callbackToken = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (!workerUrl) {
      await this.markRunFailed(run.id, 'Worker task URL is not configured');
      throw new ServiceUnavailableException('Worker task URL is not configured');
    }

    const timeoutMs = this.configService.get('WORKER_REQUEST_TIMEOUT_MS', { infer: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const workerPayload = {
        source,
        sourceRunId: run.id,
        requestId,
        callbackUrl,
        heartbeatUrl,
        callbackToken,
        listingUrl,
        limit: dto.limit,
        userId,
        careerProfileId,
        filters: normalizedFilters,
      };
      const serializedPayload = JSON.stringify(workerPayload);
      const maxPayloadBytes = this.configService.get('WORKER_TASK_MAX_PAYLOAD_BYTES', { infer: true });
      const payloadBytes = Buffer.byteLength(serializedPayload);
      if (payloadBytes > maxPayloadBytes) {
        await this.markRunFailed(run.id, `Worker payload too large: ${payloadBytes} > ${maxPayloadBytes}`);
        throw new BadRequestException(`Worker payload exceeds max size (${maxPayloadBytes} bytes)`);
      }

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: serializedPayload,
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
        acceptedFilters: normalizedFilters ?? null,
        intentFingerprint,
        resolvedFromProfile,
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
          acceptedFilters: normalizedFilters ?? null,
          intentFingerprint,
          resolvedFromProfile,
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
    await this.verifyWorkerCallbackAuthorization(authorization);
    this.verifyWorkerSignature(
      {
        sourceRunId: dto.sourceRunId,
        status: dto.status ?? 'COMPLETED',
        runId: dto.runId,
        eventId: dto.eventId,
      },
      requestId,
      workerSignature,
      workerTimestamp,
    );
    const callbackEventId = dto.eventId?.trim() || null;

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
        failureType: jobSourceRunsTable.failureType,
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
      const failureType = toRunFailureType(dto.failureType) ?? deriveFailureType(dto.error) ?? 'unknown';
      await this.transitionRunStatus(run.id, run.status as RunStatus, 'FAILED', {
        scrapedCount,
        totalFound,
        error: dto.error ?? 'Scrape failed in worker',
        failureType,
        finalizedAt: completedAt,
        completedAt,
      });
      this.logger.warn(
        {
          requestId,
          sourceRunId: run.id,
          statusFrom,
          statusTo: 'FAILED',
          failureType,
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
      const jobsToPersist = await this.reuseExistingUrlsBySourceId(run.source, sanitizedJobs);
      await this.db
        .insert(jobOffersTable)
        .values(
          jobsToPersist.map((job) => ({
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
            sourceId: sql`CASE
              WHEN excluded."source_id" IS NOT NULL AND excluded."source_id" != ''
              THEN excluded."source_id"
              ELSE "job_offers"."source_id"
            END`,
            title: sql`CASE
              WHEN excluded."title" IS NOT NULL AND excluded."title" != '' AND excluded."title" != 'Unknown title'
              THEN excluded."title"
              ELSE "job_offers"."title"
            END`,
            company: sql`CASE
              WHEN excluded."company" IS NOT NULL AND excluded."company" != ''
              THEN excluded."company"
              ELSE "job_offers"."company"
            END`,
            location: sql`CASE
              WHEN excluded."location" IS NOT NULL AND excluded."location" != ''
              THEN excluded."location"
              ELSE "job_offers"."location"
            END`,
            salary: sql`CASE
              WHEN excluded."salary" IS NOT NULL AND excluded."salary" != ''
              THEN excluded."salary"
              ELSE "job_offers"."salary"
            END`,
            employmentType: sql`CASE
              WHEN excluded."employment_type" IS NOT NULL AND excluded."employment_type" != ''
              THEN excluded."employment_type"
              ELSE "job_offers"."employment_type"
            END`,
            description: sql`CASE
              WHEN excluded."description" IS NOT NULL
               AND excluded."description" != ''
               AND excluded."description" != 'No description found'
               AND excluded."description" != 'Listing summary only'
              THEN excluded."description"
              ELSE "job_offers"."description"
            END`,
            requirements: sql`CASE
              WHEN excluded."requirements" IS NOT NULL THEN excluded."requirements"
              ELSE "job_offers"."requirements"
            END`,
            details: sql`CASE
              WHEN excluded."details" IS NOT NULL THEN excluded."details"
              ELSE "job_offers"."details"
            END`,
            fetchedAt: new Date(),
          },
        });
    }

    const finalizedAt = new Date();
    await this.transitionRunStatus(run.id, run.status as RunStatus, 'COMPLETED', {
      scrapedCount,
      totalFound,
      error: null,
      failureType: null,
      finalizedAt,
      completedAt: finalizedAt,
    });

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

    void this.autoScoreIngestedOffers(
      run.userId,
      run.id,
      inserted.map((entry) => entry.id),
    );

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

  async heartbeatRun(
    runId: string,
    dto: ScrapeHeartbeatDto,
    authorization?: string,
    requestId?: string,
    workerSignature?: string,
    workerTimestamp?: string,
  ) {
    await this.verifyWorkerCallbackAuthorization(authorization);
    this.verifyWorkerSignature(
      {
        sourceRunId: runId,
        status: 'HEARTBEAT',
        runId: dto.runId,
        eventId: 'heartbeat',
      },
      requestId,
      workerSignature,
      workerTimestamp,
    );

    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        status: jobSourceRunsTable.status,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, runId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { ok: true, status: run.status, ignored: true };
    }

    const now = new Date();
    const progress = {
      phase: dto.phase ?? null,
      attempt: dto.attempt ?? null,
      pagesVisited: dto.pagesVisited ?? 0,
      jobLinksDiscovered: dto.jobLinksDiscovered ?? 0,
      normalizedOffers: dto.normalizedOffers ?? 0,
      meta: dto.meta ?? null,
      updatedAt: now.toISOString(),
    };

    const resolvedStatus = run.status === 'PENDING' ? 'RUNNING' : (run.status as RunStatus);
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: resolvedStatus,
        error: null,
        failureType: null,
        finalizedAt: null,
        lastHeartbeatAt: now,
        progress,
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    return {
      ok: true,
      status: resolvedStatus,
      heartbeatAt: now.toISOString(),
    };
  }

  private verifyWorkerSignature(
    input: WorkerSignaturePayload,
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
    if (input.status !== 'HEARTBEAT' && !input.eventId?.trim()) {
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

    const eventId = input.eventId ?? '';
    const base = `${timestampSec}.${input.sourceRunId}.${input.status}.${input.runId ?? ''}.${requestId ?? ''}.${eventId}`;
    const expected = createHmac('sha256', signingSecret).update(base).digest('hex');
    if (!this.constantTimeEqual(signatureHeader, expected)) {
      throw new UnauthorizedException('Invalid worker callback signature');
    }
  }

  private async verifyWorkerCallbackAuthorization(authorization?: string) {
    const staticToken = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (staticToken) {
      if ((authorization ?? '') !== `Bearer ${staticToken}`) {
        throw new UnauthorizedException('Invalid worker callback token');
      }
      return;
    }

    const audience = this.configService.get('WORKER_CALLBACK_OIDC_AUDIENCE', { infer: true });
    if (!audience) {
      return;
    }

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing worker callback bearer token');
    }
    const idToken = authorization.slice('Bearer '.length).trim();
    if (!idToken) {
      throw new UnauthorizedException('Missing worker callback bearer token');
    }

    try {
      const ticket = await workerOidcClient.verifyIdToken({
        idToken,
        audience,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid worker callback OIDC token');
      }
      const expectedEmail = this.configService.get('WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL', { infer: true });
      if (expectedEmail && payload.email !== expectedEmail) {
        throw new UnauthorizedException('Invalid worker callback service account');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid worker callback OIDC token');
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
    await this.reconcileStaleRuns(userId);
    const conditions = [eq(jobSourceRunsTable.userId, userId)];
    if (query.status) {
      conditions.push(eq(jobSourceRunsTable.status, query.status as JobSourceRunStatus));
    }
    if (query.retriedFrom) {
      conditions.push(eq(jobSourceRunsTable.retryOfRunId, query.retriedFrom));
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
      items: items.map((item) => ({
        ...item,
        finalizedAt: item.finalizedAt ?? item.completedAt,
        failureType: toRunFailureType(item.failureType) ?? deriveFailureType(item.error),
      })),
      total: Number(total ?? 0),
    };
  }

  async getRun(userId: string, runId: string) {
    await this.reconcileStaleRuns(userId);
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
      finalizedAt: run.finalizedAt ?? run.completedAt,
      failureType: toRunFailureType(run.failureType) ?? deriveFailureType(run.error),
    };
  }

  async retryRun(userId: string, runId: string, requestId?: string) {
    await this.reconcileStaleRuns(userId);
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        source: jobSourceRunsTable.source,
        listingUrl: jobSourceRunsTable.listingUrl,
        filters: jobSourceRunsTable.filters,
        status: jobSourceRunsTable.status,
        careerProfileId: jobSourceRunsTable.careerProfileId,
        retryCount: jobSourceRunsTable.retryCount,
      })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }
    if (run.status !== 'FAILED') {
      throw new BadRequestException('Only failed runs can be retried');
    }
    const maxRetryDepth = this.configService.get('SCRAPE_MAX_RETRY_CHAIN_DEPTH', { infer: true });
    if (Number(run.retryCount ?? 0) >= maxRetryDepth) {
      throw new BadRequestException(`Retry chain depth exceeded (${maxRetryDepth})`);
    }

    const result = await this.enqueueScrape(
      userId,
      {
        source: mapSourceEnumToSlug(run.source),
        listingUrl: run.listingUrl,
        filters: (run.filters as Record<string, unknown> | undefined) as ScrapeFiltersDto | undefined,
        careerProfileId: run.careerProfileId ?? undefined,
        forceRefresh: true,
      },
      requestId,
    );

    const nextRetryCount = Number(run.retryCount ?? 0) + 1;
    await this.db
      .update(jobSourceRunsTable)
      .set({
        retryOfRunId: run.id,
        retryCount: nextRetryCount,
      })
      .where(eq(jobSourceRunsTable.id, result.sourceRunId));

    return {
      ...result,
      retriedFromRunId: run.id,
      retryCount: nextRetryCount,
    };
  }

  async getRunDiagnostics(userId: string, runId: string) {
    await this.reconcileStaleRuns(userId);
    const run = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const latestEvent = await this.db
      .select({
        payload: jobSourceCallbackEventsTable.payload,
      })
      .from(jobSourceCallbackEventsTable)
      .where(eq(jobSourceCallbackEventsTable.sourceRunId, runId))
      .orderBy(desc(jobSourceCallbackEventsTable.receivedAt))
      .limit(1)
      .then(([item]) => item);

    let parsedPayload: Record<string, unknown> = {};
    if (latestEvent?.payload && latestEvent.payload.trim()) {
      try {
        parsedPayload = (JSON.parse(latestEvent.payload) as Record<string, unknown>) ?? {};
      } catch {
        parsedPayload = {};
      }
    }

    const diagnostics = (parsedPayload?.diagnostics as Record<string, unknown> | undefined) ?? {};

    return {
      runId: run.id,
      source: run.source,
      status: run.status,
      listingUrl: run.listingUrl,
      finalizedAt: run.finalizedAt ?? run.completedAt,
      heartbeatAt: run.lastHeartbeatAt ?? null,
      progress: (run.progress as Record<string, unknown> | null) ?? null,
      diagnostics: {
        relaxationTrail: Array.isArray(diagnostics.relaxationTrail)
          ? diagnostics.relaxationTrail.filter((item): item is string => typeof item === 'string')
          : [],
        blockedUrls: Array.isArray(diagnostics.blockedUrls)
          ? diagnostics.blockedUrls.filter((item): item is string => typeof item === 'string')
          : [],
        hadZeroOffersStep: Boolean(diagnostics.hadZeroOffersStep),
        attemptCount: Number(diagnostics.attemptCount ?? 0),
        adaptiveDelayApplied: Number(diagnostics.adaptiveDelayApplied ?? 0),
        blockedRate: Number(diagnostics.blockedRate ?? 0),
        finalPolicy: normalizeString(String(diagnostics.finalPolicy ?? '')) ?? null,
        stats: {
          totalFound: run.totalFound ?? null,
          scrapedCount: run.scrapedCount ?? null,
          pagesVisited: Number(diagnostics.pagesVisited ?? 0),
          jobLinksDiscovered: Number(diagnostics.jobLinksDiscovered ?? run.totalFound ?? 0),
          blockedPages: Number(diagnostics.blockedPages ?? 0),
          skippedFreshUrls: Number(diagnostics.skippedFreshUrls ?? 0),
          dedupedInRunCount: Number(diagnostics.dedupedInRunCount ?? 0),
          ignoredRecommendedLinks: Number(diagnostics.ignoredRecommendedLinks ?? 0),
        },
      },
    };
  }

  async getRunDiagnosticsSummary(
    userId: string,
    windowHours?: number,
    bucket: 'hour' | 'day' = 'day',
    includeTimeline = false,
  ) {
    await this.reconcileStaleRuns(userId);
    const defaultWindowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const effectiveWindowHours = windowHours ?? defaultWindowHours;
    const cacheKey = `${userId}:${effectiveWindowHours}:${bucket}:${includeTimeline ? '1' : '0'}`;
    const cached = this.diagnosticsSummaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const cutoff = new Date(Date.now() - effectiveWindowHours * 60 * 60 * 1000);

    const runs = await this.db
      .select({
        status: jobSourceRunsTable.status,
        error: jobSourceRunsTable.error,
        failureType: jobSourceRunsTable.failureType,
        retryOfRunId: jobSourceRunsTable.retryOfRunId,
        totalFound: jobSourceRunsTable.totalFound,
        scrapedCount: jobSourceRunsTable.scrapedCount,
        startedAt: jobSourceRunsTable.startedAt,
        completedAt: jobSourceRunsTable.completedAt,
      })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.userId, userId), gte(jobSourceRunsTable.createdAt, cutoff)));

    const status = {
      total: runs.length,
      pending: runs.filter((run) => run.status === 'PENDING').length,
      running: runs.filter((run) => run.status === 'RUNNING').length,
      completed: runs.filter((run) => run.status === 'COMPLETED').length,
      failed: runs.filter((run) => run.status === 'FAILED').length,
    };

    const finalized = runs.filter((run) => run.status === 'COMPLETED' || run.status === 'FAILED');
    const durations = finalized
      .map((run) => {
        if (!run.startedAt || !run.completedAt) {
          return null;
        }
        return Math.max(0, run.completedAt.getTime() - run.startedAt.getTime());
      })
      .filter((value): value is number => typeof value === 'number');
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95DurationMs = sortedDurations.length
      ? sortedDurations[Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1)]
      : null;
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

    const avgScrapedCount = finalized.length
      ? Math.round(finalized.reduce((sum, run) => sum + Number(run.scrapedCount ?? 0), 0) / finalized.length)
      : null;
    const avgTotalFound = finalized.length
      ? Math.round(finalized.reduce((sum, run) => sum + Number(run.totalFound ?? 0), 0) / finalized.length)
      : null;
    const successRate = status.total ? Number((status.completed / status.total).toFixed(4)) : 0;

    const failures = runs
      .filter((run) => run.status === 'FAILED')
      .reduce(
        (acc, run) => {
          const failure = toRunFailureType(run.failureType) ?? deriveFailureType(run.error);
          if (!failure) {
            return acc;
          }
          acc[failure] += 1;
          return acc;
        },
        {
          timeout: 0,
          network: 0,
          validation: 0,
          parse: 0,
          callback: 0,
          unknown: 0,
        },
      );

    const lifecycle = {
      reconciledStale: runs.filter(
        (run) =>
          run.status === 'FAILED' &&
          (toRunFailureType(run.failureType) ?? deriveFailureType(run.error)) === 'timeout' &&
          run.error === '[timeout] run stale watchdog',
      ).length,
      retriedRuns: runs.filter((run) => Boolean(run.retryOfRunId)).length,
      retryCompleted: runs.filter((run) => Boolean(run.retryOfRunId) && run.status === 'COMPLETED').length,
    };

    const summary = {
      windowHours: effectiveWindowHours,
      status,
      performance: {
        avgDurationMs,
        p95DurationMs,
        avgScrapedCount,
        avgTotalFound,
        successRate,
      },
      failures,
      lifecycle,
      ...(includeTimeline ? { timeline: this.buildTimeline(finalized, bucket) } : {}),
    };

    this.diagnosticsSummaryCache.set(cacheKey, summary);
    return summary;
  }

  private buildTimeline(
    runs: Array<{
      status: string;
      startedAt: Date | null;
      completedAt: Date | null;
    }>,
    bucket: 'hour' | 'day',
  ) {
    const grouped = new Map<
      string,
      Array<{
        status: string;
        startedAt: Date | null;
        completedAt: Date | null;
      }>
    >();

    for (const run of runs) {
      const stamp = run.completedAt ?? run.startedAt;
      if (!stamp) {
        continue;
      }
      const key = this.toBucketStartIso(stamp, bucket);
      const items = grouped.get(key) ?? [];
      items.push(run);
      grouped.set(key, items);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucketStart, items]) => {
        const completed = items.filter((run) => run.status === 'COMPLETED').length;
        const failed = items.filter((run) => run.status === 'FAILED').length;
        const durations = items
          .map((run) => {
            if (!run.startedAt || !run.completedAt) {
              return null;
            }
            return Math.max(0, run.completedAt.getTime() - run.startedAt.getTime());
          })
          .filter((value): value is number => typeof value === 'number');

        return {
          bucketStart,
          total: items.length,
          completed,
          failed,
          avgDurationMs: durations.length
            ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
            : null,
          successRate: items.length ? Number((completed / items.length).toFixed(4)) : 0,
        };
      });
  }

  private toBucketStartIso(value: Date, bucket: 'hour' | 'day') {
    const date = new Date(value);
    date.setUTCMinutes(0, 0, 0);
    if (bucket === 'day') {
      date.setUTCHours(0, 0, 0, 0);
    }
    return date.toISOString();
  }

  private async tryReuseFromDatabase(input: {
    userId: string;
    careerProfileId: string;
    source: 'PRACUJ_PL';
    listingUrl: string;
    normalizedFilters: Record<string, unknown> | null;
    intentFingerprint: string;
    limit?: number;
  }) {
    const reuseHours = this.configService.get('SCRAPE_DB_REUSE_HOURS', { infer: true });
    const cutoff = new Date(Date.now() - reuseHours * 60 * 60 * 1000);
    const recentRuns = await this.db
      .select({
        id: jobSourceRunsTable.id,
        listingUrl: jobSourceRunsTable.listingUrl,
        filters: jobSourceRunsTable.filters,
        completedAt: jobSourceRunsTable.completedAt,
      })
      .from(jobSourceRunsTable)
      .where(
        and(
          eq(jobSourceRunsTable.source, input.source),
          eq(jobSourceRunsTable.status, 'COMPLETED'),
          gte(jobSourceRunsTable.completedAt, cutoff),
        ),
      )
      .orderBy(desc(jobSourceRunsTable.completedAt))
      .limit(30);

    const targetFilters = stableJson(input.normalizedFilters);
    const reusedRun = recentRuns.find((run) => {
      const fingerprint = this.computeIntentFingerprint(
        'pracuj-pl',
        run.listingUrl,
        (run.filters as Record<string, unknown> | null) ?? null,
      );
      if (fingerprint === input.intentFingerprint) {
        return true;
      }
      if (input.normalizedFilters) {
        return stableJson(run.filters) === targetFilters;
      }
      return run.listingUrl === input.listingUrl;
    });
    if (!reusedRun) {
      return null;
    }

    const baseOffersQuery = this.db
      .select({ id: jobOffersTable.id })
      .from(jobOffersTable)
      .where(eq(jobOffersTable.runId, reusedRun.id))
      .orderBy(desc(jobOffersTable.fetchedAt));
    const offersQuery = input.limit ? baseOffersQuery.limit(input.limit) : baseOffersQuery;
    const offers = await offersQuery;
    if (!offers.length) {
      return null;
    }

    const now = new Date();
    const [reuseRun] = await this.db
      .insert(jobSourceRunsTable)
      .values({
        source: input.source,
        userId: input.userId,
        careerProfileId: input.careerProfileId,
        listingUrl: input.listingUrl,
        filters: input.normalizedFilters,
        status: 'COMPLETED',
        startedAt: now,
        completedAt: now,
        totalFound: offers.length,
        scrapedCount: 0,
      })
      .returning({ id: jobSourceRunsTable.id, createdAt: jobSourceRunsTable.createdAt });
    if (!reuseRun?.id) {
      return null;
    }

    const inserted = await this.db
      .insert(userJobOffersTable)
      .values(
        offers.map((offer) => ({
          userId: input.userId,
          careerProfileId: input.careerProfileId,
          jobOfferId: offer.id,
          sourceRunId: reuseRun.id,
          statusHistory: [{ status: 'NEW', changedAt: now.toISOString() }],
          lastStatusAt: now,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: userJobOffersTable.id });

    if (inserted.length) {
      void this.autoScoreIngestedOffers(
        input.userId,
        reuseRun.id,
        inserted.map((row) => row.id),
      );
    }

    return {
      sourceRunId: reuseRun.id,
      acceptedAt: (reuseRun.createdAt ?? now).toISOString(),
      inserted: inserted.length,
      totalOffers: offers.length,
      reusedFromRunId: reusedRun.id,
    };
  }

  private shouldSuppressDuplicateEnqueue(userId: string, intentFingerprint: string) {
    const ttlSec = this.configService.get('SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC', { infer: true });
    if (!ttlSec || ttlSec <= 0) {
      return false;
    }
    const now = Date.now();
    const cutoff = now - ttlSec * 1000;
    for (const [key, timestamp] of this.enqueueIdempotencyWindow.entries()) {
      if (timestamp < cutoff) {
        this.enqueueIdempotencyWindow.delete(key);
      }
    }
    const key = `${userId}:${intentFingerprint}`;
    const previous = this.enqueueIdempotencyWindow.get(key);
    if (previous && previous >= cutoff) {
      return true;
    }
    this.enqueueIdempotencyWindow.set(key, now);
    return false;
  }

  private async getCareerProfileContext(userId: string, requestedCareerProfileId?: string | null) {
    const conditions = requestedCareerProfileId
      ? and(
          eq(careerProfilesTable.id, requestedCareerProfileId),
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.status, 'READY'),
        )
      : and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        );

    const row = await this.db
      .select({
        careerProfileId: careerProfilesTable.id,
        contentJson: careerProfilesTable.contentJson,
      })
      .from(careerProfilesTable)
      .where(conditions)
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    const parsedProfile = row?.contentJson ? parseCandidateProfile(row.contentJson) : null;

    return {
      careerProfileId: row?.careerProfileId ?? null,
      profile: parsedProfile?.success ? parsedProfile.data : null,
    };
  }

  private computeIntentFingerprint(
    source: PracujSourceKind,
    listingUrl: string,
    normalizedFilters: Record<string, unknown> | null,
  ) {
    const payload = stableJson({
      source,
      listingUrl,
      normalizedFilters,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private assertListingUrlAllowed(source: PracujSourceKind, listingUrl: string) {
    let parsed: URL;
    try {
      parsed = new URL(listingUrl);
    } catch {
      throw new BadRequestException('Invalid listingUrl');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('listingUrl must use http or https');
    }

    if (source === 'pracuj-pl' || source === 'pracuj-pl-it' || source === 'pracuj-pl-general') {
      const hostname = parsed.hostname.toLowerCase();
      if (!(hostname === 'pracuj.pl' || hostname.endsWith('.pracuj.pl'))) {
        throw new BadRequestException('listingUrl host is not allowed for this source');
      }
    }
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

  private resolveWorkerHeartbeatUrl(runId: string) {
    const configured = this.configService.get('WORKER_CALLBACK_URL', { infer: true });
    if (configured) {
      try {
        const parsed = new URL(configured);
        const basePath = parsed.pathname.replace(/\/job-sources\/complete\/?$/i, '');
        parsed.pathname = `${basePath}/job-sources/runs/${runId}/heartbeat`;
        return parsed.toString();
      } catch {
        return configured.replace(/\/job-sources\/complete\/?$/i, `/job-sources/runs/${runId}/heartbeat`);
      }
    }

    const host = this.configService.get('HOST', { infer: true }) ?? 'localhost';
    const port = this.configService.get('PORT', { infer: true }) ?? 3000;
    const prefix = this.configService.get('API_PREFIX', { infer: true }) ?? 'api';
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return `http://${host}:${port}/${normalizedPrefix}/job-sources/runs/${runId}/heartbeat`;
  }

  private assertAllowedRunTransition(from: RunStatus, to: RunStatus) {
    if (from === to) {
      return;
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Invalid scrape run status transition: ${from} -> ${to}`);
    }
  }

  private async transitionRunStatus(
    runId: string,
    fromStatus: RunStatus,
    toStatus: RunStatus,
    fields: Partial<{
      scrapedCount: number;
      totalFound: number | null;
      error: string | null;
      failureType: RunFailureType | null;
      finalizedAt: Date | null;
      completedAt: Date | null;
      lastHeartbeatAt: Date | null;
      progress: Record<string, unknown> | null;
      startedAt: Date | null;
    }> = {},
  ) {
    this.assertAllowedRunTransition(fromStatus, toStatus);

    const result = await this.db
      .update(jobSourceRunsTable)
      .set({
        status: toStatus,
        ...fields,
      })
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.status, fromStatus)));

    if (result && typeof (result as { returning?: unknown }).returning === 'function') {
      const rows = await (result as unknown as { returning: (selection: Record<string, unknown>) => Promise<Array<{ id: string }>> }).returning({
        id: jobSourceRunsTable.id,
      });
      return rows.length > 0;
    }

    await result;
    return true;
  }

  private async markRunFailed(runId: string, error: string) {
    const now = new Date();
    const failureType = deriveFailureType(error) ?? 'unknown';
    await this.transitionRunStatus(runId, 'PENDING', 'FAILED', {
      error,
      failureType,
      finalizedAt: now,
      completedAt: now,
    });
  }

  private async reconcileStaleRuns(userId: string) {
    if (typeof (this.db as any).update !== 'function') {
      return;
    }
    const stalePendingMinutes = this.configService.get('SCRAPE_STALE_PENDING_MINUTES', { infer: true });
    const staleRunningMinutes = this.configService.get('SCRAPE_STALE_RUNNING_MINUTES', { infer: true });
    const now = new Date();
    const stalePendingCutoff = new Date(now.getTime() - stalePendingMinutes * 60 * 1000);
    const staleRunningCutoff = new Date(now.getTime() - staleRunningMinutes * 60 * 1000);
    const staleError = '[timeout] run stale watchdog';

    const updatePending = (this.db as any).update(jobSourceRunsTable);
    if (!updatePending || typeof updatePending.set !== 'function') {
      return;
    }
    await updatePending
      .set({
        status: 'FAILED',
        error: staleError,
        failureType: 'timeout',
        finalizedAt: now,
        completedAt: now,
      })
      .where(
        and(
          eq(jobSourceRunsTable.userId, userId),
          eq(jobSourceRunsTable.status, 'PENDING'),
          lt(jobSourceRunsTable.createdAt, stalePendingCutoff),
        ),
      );

    const updateRunning = (this.db as any).update(jobSourceRunsTable);
    if (!updateRunning || typeof updateRunning.set !== 'function') {
      return;
    }
    await updateRunning
      .set({
        status: 'FAILED',
        error: staleError,
        failureType: 'timeout',
        finalizedAt: now,
        completedAt: now,
      })
      .where(
        and(
          eq(jobSourceRunsTable.userId, userId),
          eq(jobSourceRunsTable.status, 'RUNNING'),
          or(
            lt(jobSourceRunsTable.lastHeartbeatAt, staleRunningCutoff),
            and(isNull(jobSourceRunsTable.lastHeartbeatAt), lt(jobSourceRunsTable.startedAt, staleRunningCutoff)),
            and(isNull(jobSourceRunsTable.startedAt), lt(jobSourceRunsTable.createdAt, staleRunningCutoff)),
          ),
        ),
      );
  }

  private async markRunRunning(runId: string) {
    await this.transitionRunStatus(runId, 'PENDING', 'RUNNING', {
      error: null,
      failureType: null,
      finalizedAt: null,
    });
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
      failureType: dto.failureType ?? null,
      failureCode: dto.failureCode ?? null,
      jobCount: dto.jobs?.length ?? dto.scrapedCount ?? dto.jobCount ?? 0,
      diagnostics: dto.diagnostics ?? null,
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
      this.logger.warn(
        { userId, userOfferCount: userOfferIds.length },
        'JobOffersService unavailable, skipping auto-score',
      );
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

  private async reuseExistingUrlsBySourceId(source: 'PRACUJ_PL', jobs: CallbackJobPayload[]) {
    const sourceIds = Array.from(
      new Set(jobs.map((job) => job.sourceId).filter((value): value is string => Boolean(value))),
    );
    if (!sourceIds.length) {
      return jobs;
    }

    const existing = await this.db
      .select({
        sourceId: jobOffersTable.sourceId,
        url: jobOffersTable.url,
      })
      .from(jobOffersTable)
      .where(and(eq(jobOffersTable.source, source), inArray(jobOffersTable.sourceId, sourceIds)));

    if (!existing.length) {
      return jobs;
    }

    const urlBySourceId = new Map(
      existing.filter((row) => row.sourceId && row.url).map((row) => [row.sourceId!, row.url]),
    );

    return jobs.map((job) => {
      if (!job.sourceId) {
        return job;
      }
      const canonicalUrl = urlBySourceId.get(job.sourceId);
      if (!canonicalUrl) {
        return job;
      }
      return {
        ...job,
        url: canonicalUrl,
      };
    });
  }
}

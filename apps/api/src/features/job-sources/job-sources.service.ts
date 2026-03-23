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
import { and, count, desc, eq, getTableColumns, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { OAuth2Client } from 'google-auth-library';
import { CloudTasksClient } from '@google-cloud/tasks';
import { Logger } from 'nestjs-pino';
import {
  careerProfilesTable,
  jobOffersTable,
  jobSourceCallbackEventsTable,
  jobSourceRunEventsTable,
  jobSourceRunAttemptsTable,
  jobSourceRunsTable,
  scrapeScheduleEventsTable,
  scrapeSchedulesTable,
  scrapeExecutionEventsTable,
  userJobOffersTable,
  usersTable,
  type JobOfferQualityState,
  type UserJobOfferOrigin,
  buildPracujListingUrl,
  classifyScrapeOutcome,
  normalizePracujFilters,
  normalizeScrapeEmptyReason,
  normalizeScrapeResultKind,
  normalizeScrapeSourceQuality,
  type PracujSourceKind,
  JobSourceRunStatus,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';
import { JobOffersService } from '@/features/job-offers/job-offers.service';
import { MailService } from '@/features/auth/mail.service';
import {
  parseCandidateProfile,
  type CandidateProfile,
} from '@/features/career-profiles/schema/candidate-profile.schema';
import { scoreCandidateAgainstJob } from '@/features/job-matching/candidate-matcher';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';
import { ScrapeHeartbeatDto } from './dto/scrape-heartbeat.dto';
import { buildFiltersFromProfile, buildMatchingFiltersFromProfile, inferPracujSource } from './scrape-request-resolver';
import { RunDiagnosticsSummaryCache } from './run-diagnostics-summary-cache';
import { UpdateScrapeScheduleDto } from './dto/scrape-schedule.dto';

import type { Env } from '@/config/env';

type CallbackJobPayload = NonNullable<ScrapeCompleteDto['jobs']>[number];
type RunFailureType = 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown';
type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type CatalogRecommendationAction = 'scrape' | 'rematch' | 'blocked';
type RunEventSeverity = 'info' | 'warning' | 'error';
type WorkerSignaturePayload = {
  sourceRunId: string;
  status: string;
  runId?: string;
  eventId?: string;
};
type RunEventInput = {
  sourceRunId: string;
  traceId: string;
  eventType: string;
  message: string;
  severity?: RunEventSeverity;
  requestId?: string | null;
  phase?: string | null;
  attemptNo?: number | null;
  code?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};
type ScheduleEventSeverity = 'info' | 'warning' | 'error';
type ScheduleEventInput = {
  scheduleId: string;
  userId: string;
  sourceRunId?: string | null;
  traceId?: string | null;
  requestId?: string | null;
  eventType: string;
  message: string;
  severity?: ScheduleEventSeverity;
  code?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};
type ExecutionEventSnapshot = {
  stage: string;
  status: string;
  code: string | null;
  meta: unknown;
};
type CallbackEventRegisterResult =
  | { accepted: true; payloadHash: string; attemptNo: number; emittedAt: Date | null }
  | {
      accepted: false;
      reasonCode: 'DUPLICATE_EVENT_ID' | 'CONFLICTING_EVENT_PAYLOAD' | 'STALE_ATTEMPT' | 'ATTEMPT_ORDER_VIOLATION';
    };

type CatalogOfferRow = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  employmentType: string | null;
  description: string;
  requirements: unknown;
  details: unknown;
  lastSeenAt: Date | null;
};
type JobOfferInsert = typeof jobOffersTable.$inferInsert;
type UserJobOfferInsert = typeof userJobOffersTable.$inferInsert;

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

const excludedColumn = (column: { name: string }) => sql.raw(`excluded."${column.name}"`);

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
      isExpired: job.isExpired,
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
  if (
    value === 'timeout' ||
    value === 'network' ||
    value === 'validation' ||
    value === 'parse' ||
    value === 'callback'
  ) {
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
const computeSha256Hex = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex');
const normalizeOfferUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};
const computeOfferIdentityKey = (job: { sourceId?: string | null; url: string }) => {
  const sourceId = normalizeString(job.sourceId);
  if (sourceId) {
    return `source:${sourceId.toLowerCase()}`;
  }
  return `url:${normalizeOfferUrl(job.url)}`;
};
const resolveCallbackPayloadHash = (dto: ScrapeCompleteDto) =>
  normalizeString(dto.payloadHash) ??
  computeSha256Hex({
    eventId: normalizeString(dto.eventId),
    source: normalizeString(dto.source),
    runId: normalizeString(dto.runId),
    sourceRunId: dto.sourceRunId,
    attemptNo: dto.attemptNo ?? 1,
    emittedAt: normalizeString(dto.emittedAt),
    listingUrl: normalizeString(dto.listingUrl),
    status: dto.status ?? 'COMPLETED',
    scrapedCount: dto.scrapedCount ?? null,
    totalFound: dto.totalFound ?? null,
    jobCount: dto.jobCount ?? null,
    jobLinkCount: dto.jobLinkCount ?? null,
    outputPath: normalizeString(dto.outputPath),
    error: normalizeString(dto.error),
    failureType: normalizeString(dto.failureType),
    failureCode: normalizeString(dto.failureCode),
    jobs: dto.jobs ?? [],
    diagnostics: dto.diagnostics ?? null,
  });
const workerOidcClient = new OAuth2Client();
const WORKER_TASK_SCHEMA_VERSION = '1' as const;
const WORKER_OIDC_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const CATALOG_MATCH_VERSION = 2;
const CATALOG_MATCH_ENGINE = 'catalog-rematch-v1';
const ACCEPTED_QUALITY_STATE: JobOfferQualityState = 'ACCEPTED';
const DEFAULT_CATALOG_REMATCH_HOURS = 72;
const DEFAULT_CATALOG_REMATCH_BATCH_SIZE = 250;
const DEFAULT_CATALOG_REMATCH_MIN_SCORE = 60;
const DEFAULT_SCRAPE_SOURCE_FAILURE_WINDOW_RUNS = 5;
const DEFAULT_SCRAPE_SOURCE_FAILURE_THRESHOLD = 3;
const DEFAULT_SCRAPE_SOURCE_AUTOMATION_BACKOFF_MINUTES = 30;
const HEARTBEAT_EVENT_DEDUP_WINDOW_MS = 15_000;

const parseSchedule = (
  cron: string,
): { kind: 'everyMinutes'; minutes: number } | { kind: 'daily'; hour: number; minute: number } => {
  const everyMinutes = /^\*\/(\d{1,2}) \* \* \* \*$/;
  const daily = /^(\d{1,2}) (\d{1,2}) \* \* \*$/;
  const everyMinutesMatch = cron.trim().match(everyMinutes);
  if (everyMinutesMatch) {
    const minutes = Number(everyMinutesMatch[1]);
    return { kind: 'everyMinutes', minutes: Math.max(1, Math.min(59, minutes)) };
  }
  const dailyMatch = cron.trim().match(daily);
  if (dailyMatch) {
    const minute = Number(dailyMatch[1]);
    const hour = Number(dailyMatch[2]);
    return {
      kind: 'daily',
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(59, minute)),
    };
  }
  return { kind: 'daily', hour: 9, minute: 0 };
};

const computeNextRunAt = (cron: string, from: Date): Date => {
  const parsed = parseSchedule(cron);
  if (parsed.kind === 'everyMinutes') {
    return new Date(from.getTime() + parsed.minutes * 60 * 1000);
  }
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(parsed.hour, parsed.minute, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
};

@Injectable()
export class JobSourcesService {
  private readonly diagnosticsSummaryCache = new RunDiagnosticsSummaryCache<any>(30000);
  private readonly enqueueIdempotencyWindow = new Map<string, number>();
  private readonly cloudTasksClient = new CloudTasksClient();
  private enqueueSuppressedCount = 0;

  private resolveAdaptiveQueryWindow() {
    const min = this.configService.get('SCRAPE_ADAPTIVE_QUERY_TARGET_MIN', { infer: true });
    const max = this.configService.get('SCRAPE_ADAPTIVE_QUERY_TARGET_MAX', { infer: true });
    return { min, max };
  }

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
    @Optional() private readonly jobOffersService?: JobOffersService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  async getSchedule(userId: string) {
    const schedule = await this.db
      .select()
      .from(scrapeSchedulesTable)
      .where(eq(scrapeSchedulesTable.userId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!schedule) {
      return {
        enabled: false,
        cron: '0 9 * * *',
        timezone: 'Europe/Warsaw',
        source: 'pracuj-pl-it',
        limit: 20,
        careerProfileId: null,
        filters: null,
        lastTriggeredAt: null,
        nextRunAt: null,
        lastRunStatus: null,
      };
    }

    return {
      enabled: schedule.enabled === 1,
      cron: schedule.cron,
      timezone: schedule.timezone,
      source: schedule.source,
      limit: schedule.limit,
      careerProfileId: schedule.careerProfileId,
      filters: (schedule.filters as Record<string, unknown> | null) ?? null,
      lastTriggeredAt: schedule.lastTriggeredAt?.toISOString() ?? null,
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      lastRunStatus: schedule.lastRunStatus ?? null,
    };
  }

  async getPreflight(userId: string, dto: EnqueueScrapeDto) {
    await this.reconcileStaleRuns(userId);
    const profileContext = await this.getCareerProfileContext(userId, dto.careerProfileId);
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!profileContext?.careerProfileId) {
      blockers.push('career-profile-not-ready');
    }

    const inferredSource = profileContext.profile ? inferPracujSource(profileContext.profile) : 'pracuj-pl-it';
    const source = (dto.source ?? inferredSource) as PracujSourceKind;
    const profileDerivedAcquisitionFilters = dto.filters
      ? undefined
      : profileContext.profile
        ? buildFiltersFromProfile(profileContext.profile)
        : undefined;
    const rawFilters = (dto.filters as ScrapeFiltersDto | undefined) ?? profileDerivedAcquisitionFilters;
    const normalizedFiltersResult = normalizePracujFilters(source, rawFilters);
    const normalizedFilters = Object.keys(normalizedFiltersResult.filters).length
      ? normalizedFiltersResult.filters
      : undefined;
    const listingUrl =
      dto.listingUrl ?? (normalizedFilters ? buildPracujListingUrl(source, normalizedFilters) : undefined) ?? null;

    if (!listingUrl) {
      blockers.push('listing-url-unresolved');
    } else {
      this.assertListingUrlAllowed(source, listingUrl);
    }

    const activeRunsResult = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.userId, userId), inArray(jobSourceRunsTable.status, ['PENDING', 'RUNNING'])));
    const activeRunCount = Number(activeRunsResult[0]?.value ?? 0);
    const maxActiveRuns = this.configService.get('SCRAPE_MAX_ACTIVE_RUNS_PER_USER', { infer: true });
    if (typeof maxActiveRuns === 'number' && activeRunCount >= maxActiveRuns) {
      blockers.push('active-run-limit');
    }

    let dailyRemaining: number | null = null;
    const dailyEnqueueLimit = this.configService.get('SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER', { infer: true });
    if (typeof dailyEnqueueLimit === 'number' && dailyEnqueueLimit > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyRunsResult = await this.db
        .select({ value: count() })
        .from(jobSourceRunsTable)
        .where(and(eq(jobSourceRunsTable.userId, userId), gte(jobSourceRunsTable.createdAt, since)));
      const dailyRunCount = Number(dailyRunsResult[0]?.value ?? 0);
      dailyRemaining = Math.max(0, dailyEnqueueLimit - dailyRunCount);
      if (dailyRunCount >= dailyEnqueueLimit) {
        blockers.push('daily-budget-exhausted');
      } else if (dailyRunCount >= dailyEnqueueLimit - 1) {
        warnings.push('daily-budget-nearly-exhausted');
      }
    }

    if (normalizedFiltersResult.dropped && Object.keys(normalizedFiltersResult.dropped).length > 0) {
      warnings.push('filters-relaxed-during-normalization');
    }
    if (!dto.filters && !dto.listingUrl) {
      warnings.push('using-profile-derived-filters');
    }

    const requestedLimit = dto.limit ?? 20;
    const catalogEligibleCount = profileContext.profile
      ? await this.countCatalogMatchesForProfile(profileContext.profile, mapSource(source), requestedLimit)
      : 0;
    const sourceBackoff = await this.getSourceAutomationBackoff(mapSource(source));
    if (sourceBackoff.active) {
      warnings.push('source-health-backoff');
    }

    const schedule = await this.getSchedule(userId);
    const blockerDetails = blockers.map((code) => this.buildPreflightBlockerDetail(code));
    const warningDetails = warnings.map((code) => this.buildPreflightWarningDetail(code));
    const recommendedAction: CatalogRecommendationAction =
      blockers.length > 0 ? 'blocked' : catalogEligibleCount >= requestedLimit ? 'rematch' : 'scrape';
    const guidance =
      blockerDetails.length > 0
        ? 'Resolve the blocking items before enqueueing a run.'
        : recommendedAction === 'rematch'
          ? 'Recent accepted catalog offers already cover this profile. Reuse matched offers before spending another scrape.'
          : warningDetails.length > 0
            ? 'Review the warnings below. You can still enqueue a run if they are acceptable.'
            : schedule.enabled
              ? 'Your filters are ready and automation is enabled. You can run now or wait for the next scheduled trigger.'
              : 'Your filters are ready. Enqueue a manual run now or save a schedule for later automation.';

    return {
      ready: blockers.length === 0,
      blockers,
      warnings,
      source,
      listingUrl,
      acceptedFilters: normalizedFilters ?? null,
      resolvedFromProfile: !dto.filters && !dto.source && Boolean(profileContext.profile),
      activeRunCount,
      dailyRemaining,
      recommendedAction,
      catalogEligibleCount,
      catalogFreshUntil: this.resolveCatalogFreshUntil(),
      blockerDetails,
      warningDetails,
      guidance,
      schedule: {
        enabled: schedule.enabled,
        cron: schedule.cron ?? null,
        source: schedule.source ?? null,
        limit: schedule.limit ?? null,
        nextRunAt: schedule.nextRunAt ?? null,
        lastRunStatus: schedule.lastRunStatus ?? null,
      },
      sourceHealth: sourceBackoff.active
        ? {
            paused: true,
            pausedUntil: sourceBackoff.pausedUntil?.toISOString() ?? null,
            recentFailures: sourceBackoff.failureCount,
            windowRuns: sourceBackoff.windowRuns,
            dominantFailureReasons: sourceBackoff.dominantFailureReasons,
          }
        : {
            paused: false,
            pausedUntil: null,
            recentFailures: sourceBackoff.failureCount,
            windowRuns: sourceBackoff.windowRuns,
            dominantFailureReasons: sourceBackoff.dominantFailureReasons,
          },
    };
  }

  async updateSchedule(userId: string, dto: UpdateScrapeScheduleDto) {
    const now = new Date();
    const cron = dto.cron ?? '0 9 * * *';
    const enabled = dto.enabled ? 1 : 0;
    const values = {
      userId,
      enabled,
      cron,
      timezone: dto.timezone ?? 'Europe/Warsaw',
      source: dto.source ?? 'pracuj-pl-it',
      limit: dto.limit ?? 20,
      careerProfileId: dto.careerProfileId ?? null,
      filters: (dto.filters as Record<string, unknown> | undefined) ?? null,
      nextRunAt: enabled ? computeNextRunAt(cron, now) : null,
      updatedAt: now,
    };

    const existing = await this.db
      .select({ id: scrapeSchedulesTable.id })
      .from(scrapeSchedulesTable)
      .where(eq(scrapeSchedulesTable.userId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    let scheduleId = existing?.id ?? null;

    if (existing) {
      await this.db.update(scrapeSchedulesTable).set(values).where(eq(scrapeSchedulesTable.id, existing.id));
    } else {
      const [inserted] = await this.db
        .insert(scrapeSchedulesTable)
        .values({
          ...values,
          createdAt: now,
        })
        .returning({ id: scrapeSchedulesTable.id });
      scheduleId = inserted?.id ?? null;
    }

    if (!scheduleId) {
      scheduleId = existing?.id ?? null;
    }

    if (scheduleId) {
      await this.appendScheduleEvent({
        scheduleId,
        userId,
        eventType: 'schedule_updated',
        message: enabled ? 'Scrape schedule saved and enabled.' : 'Scrape schedule saved and disabled.',
        meta: {
          cron,
          timezone: values.timezone,
          source: values.source,
          limit: values.limit,
          nextRunAt: values.nextRunAt?.toISOString() ?? null,
        },
        createdAt: now,
      });
    }

    return this.getSchedule(userId);
  }

  async triggerScheduleNow(userId: string, requestId?: string) {
    const schedule = await this.db
      .select()
      .from(scrapeSchedulesTable)
      .where(eq(scrapeSchedulesTable.userId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!schedule || schedule.enabled !== 1) {
      throw new BadRequestException('Scrape schedule is not enabled');
    }

    const acceptedAt = new Date();
    await this.appendScheduleEvents([
      {
        scheduleId: schedule.id,
        userId,
        requestId,
        eventType: 'schedule_trigger_received',
        message: 'Manual schedule trigger accepted.',
        meta: { triggerMode: 'manual' },
        createdAt: acceptedAt,
      },
      {
        scheduleId: schedule.id,
        userId,
        requestId,
        eventType: 'schedule_enqueue_started',
        message: 'Scrape enqueue started from manual schedule trigger.',
        meta: { triggerMode: 'manual' },
        createdAt: acceptedAt,
      },
    ]);

    try {
      const response = await this.enqueueScrape(
        userId,
        {
          source: schedule.source,
          limit: schedule.limit,
          careerProfileId: schedule.careerProfileId ?? undefined,
          filters: (schedule.filters as ScrapeFiltersDto | null) ?? undefined,
        },
        requestId,
        'manual',
      );

      await this.db
        .update(scrapeSchedulesTable)
        .set({
          lastTriggeredAt: acceptedAt,
          lastRunStatus: 'ENQUEUED_MANUAL',
          updatedAt: acceptedAt,
        })
        .where(eq(scrapeSchedulesTable.id, schedule.id));

      await this.appendScheduleEvent({
        scheduleId: schedule.id,
        userId,
        sourceRunId: response.sourceRunId,
        traceId: response.traceId ?? null,
        requestId,
        eventType: 'schedule_enqueue_succeeded',
        message: 'Manual schedule trigger enqueued a scrape run successfully.',
        code: 'MANUAL_TRIGGER',
        meta: { triggerMode: 'manual' },
        createdAt: acceptedAt,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Schedule trigger failed';
      await this.db
        .update(scrapeSchedulesTable)
        .set({
          lastRunStatus: 'ENQUEUE_FAILED_MANUAL',
          updatedAt: acceptedAt,
        })
        .where(eq(scrapeSchedulesTable.id, schedule.id));

      await this.appendScheduleEvent({
        scheduleId: schedule.id,
        userId,
        requestId,
        eventType: 'schedule_enqueue_failed',
        severity: 'error',
        code: 'MANUAL_TRIGGER',
        message: 'Manual schedule trigger failed before scrape enqueue completed.',
        meta: {
          triggerMode: 'manual',
          error: message,
        },
        createdAt: acceptedAt,
      });

      throw error;
    }
  }

  async triggerSchedules(authorization: string | undefined, requestId?: string) {
    const schedulerToken = this.configService.get('SCHEDULER_AUTH_TOKEN', { infer: true });
    if (!schedulerToken) {
      throw new ServiceUnavailableException('Scheduler auth token is not configured');
    }

    const providedToken = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!providedToken || providedToken !== schedulerToken) {
      throw new UnauthorizedException('Invalid scheduler token');
    }

    const batchSize = this.configService.get('SCHEDULER_TRIGGER_BATCH_SIZE', { infer: true });
    const acceptedAt = new Date();
    const schedules = await this.db
      .select()
      .from(scrapeSchedulesTable)
      .where(
        and(
          eq(scrapeSchedulesTable.enabled, 1),
          or(
            isNull(scrapeSchedulesTable.nextRunAt),
            lt(scrapeSchedulesTable.nextRunAt, new Date(acceptedAt.getTime() + 1000)),
          ),
        ),
      )
      .orderBy(scrapeSchedulesTable.nextRunAt, scrapeSchedulesTable.updatedAt)
      .limit(batchSize);

    const results: Array<{ userId: string; ok: boolean; sourceRunId?: string; error?: string }> = [];
    for (const schedule of schedules) {
      const nextRunAt = computeNextRunAt(schedule.cron, acceptedAt);
      await this.appendScheduleEvents([
        {
          scheduleId: schedule.id,
          userId: schedule.userId,
          requestId,
          eventType: 'schedule_trigger_received',
          message: 'Scheduler picked up a due scrape schedule.',
          code: 'INTERNAL_SCHEDULER',
          meta: {
            dueAt: schedule.nextRunAt?.toISOString() ?? null,
            nextRunAt: nextRunAt.toISOString(),
          },
          createdAt: acceptedAt,
        },
        {
          scheduleId: schedule.id,
          userId: schedule.userId,
          requestId,
          eventType: 'schedule_enqueue_started',
          message: 'Scheduler started scrape enqueue for due schedule.',
          code: 'INTERNAL_SCHEDULER',
          meta: {
            dueAt: schedule.nextRunAt?.toISOString() ?? null,
            nextRunAt: nextRunAt.toISOString(),
          },
          createdAt: acceptedAt,
        },
      ]);
      try {
        const response = await this.enqueueScrape(
          schedule.userId,
          {
            source: schedule.source,
            limit: schedule.limit,
            careerProfileId: schedule.careerProfileId ?? undefined,
            filters: (schedule.filters as ScrapeFiltersDto | null) ?? undefined,
            forceRefresh: false,
          },
          requestId,
          'scheduled',
        );
        await this.db
          .update(scrapeSchedulesTable)
          .set({
            lastTriggeredAt: acceptedAt,
            nextRunAt,
            lastRunStatus: 'ENQUEUED',
            updatedAt: acceptedAt,
          })
          .where(eq(scrapeSchedulesTable.id, schedule.id));
        await this.appendScheduleEvent({
          scheduleId: schedule.id,
          userId: schedule.userId,
          sourceRunId: response.sourceRunId,
          traceId: response.traceId ?? null,
          requestId,
          eventType: 'schedule_enqueue_succeeded',
          message: 'Scheduler enqueued a scrape run successfully.',
          code: 'INTERNAL_SCHEDULER',
          meta: {
            nextRunAt: nextRunAt.toISOString(),
          },
          createdAt: acceptedAt,
        });
        results.push({ userId: schedule.userId, ok: true, sourceRunId: response.sourceRunId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Schedule trigger failed';
        await this.db
          .update(scrapeSchedulesTable)
          .set({
            nextRunAt,
            lastRunStatus: 'ENQUEUE_FAILED',
            updatedAt: acceptedAt,
          })
          .where(eq(scrapeSchedulesTable.id, schedule.id));
        await this.appendScheduleEvent({
          scheduleId: schedule.id,
          userId: schedule.userId,
          requestId,
          eventType: 'schedule_enqueue_failed',
          severity: 'error',
          code: 'INTERNAL_SCHEDULER',
          message: 'Scheduler failed while enqueueing a due scrape run.',
          meta: {
            error: message,
            nextRunAt: nextRunAt.toISOString(),
          },
          createdAt: acceptedAt,
        });
        results.push({ userId: schedule.userId, ok: false, error: message });
      }
    }

    return {
      ok: true,
      acceptedAt: acceptedAt.toISOString(),
      scanned: schedules.length,
      triggered: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }

  async enqueueScrape(
    userId: string,
    dto: EnqueueScrapeDto,
    incomingRequestId?: string,
    triggerMode: 'direct' | 'manual' | 'scheduled' = 'direct',
  ) {
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
    const requestedLimit = dto.limit ?? 20;
    if (triggerMode === 'scheduled') {
      const sourceBackoff = await this.getSourceAutomationBackoff(sourceEnum);
      if (sourceBackoff.active) {
        throw new BadRequestException(
          `Automation paused for ${sourceEnum} until ${sourceBackoff.pausedUntil?.toISOString() ?? 'later'} due to recent source failures.`,
        );
      }
    }
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

    const dailyEnqueueLimit = this.configService.get('SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER', { infer: true });
    if (typeof dailyEnqueueLimit === 'number' && dailyEnqueueLimit > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyRunsResult = await this.db
        .select({ value: count() })
        .from(jobSourceRunsTable)
        .where(and(eq(jobSourceRunsTable.userId, userId), gte(jobSourceRunsTable.createdAt, since)));
      const [dailyRuns] = Array.isArray(dailyRunsResult) ? dailyRunsResult : [];
      const dailyRunCount = Number(dailyRuns?.value ?? 0);
      if (dailyRunCount >= dailyEnqueueLimit) {
        throw new HttpException(
          `Daily scrape limit reached (${dailyRunCount}/${dailyEnqueueLimit}) for last 24 hours.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const profileDerivedAcquisitionFilters = dto.filters
      ? undefined
      : profileContext.profile
        ? buildFiltersFromProfile(profileContext.profile)
        : undefined;
    const profileDerivedMatchingFilters =
      dto.filters || !profileContext.profile ? undefined : buildMatchingFiltersFromProfile(profileContext.profile);
    const rawFilters = (dto.filters as ScrapeFiltersDto | undefined) ?? profileDerivedAcquisitionFilters;
    const normalizedFiltersResult = normalizePracujFilters(source, rawFilters);
    const normalizedFilters = Object.keys(normalizedFiltersResult.filters).length
      ? normalizedFiltersResult.filters
      : undefined;
    const normalizedMatchingFiltersResult = normalizePracujFilters(
      source,
      (dto.filters as ScrapeFiltersDto | undefined) ?? profileDerivedMatchingFilters,
    );
    const normalizedMatchingFilters = Object.keys(normalizedMatchingFiltersResult.filters).length
      ? normalizedMatchingFiltersResult.filters
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
      const catalogReuse = await this.tryServeFromCatalog({
        userId,
        careerProfileId,
        profile: profileContext.profile,
        source: sourceEnum,
        limit: requestedLimit,
      });

      if (catalogReuse) {
        this.logger.log(
          {
            requestId,
            sourceRunId: catalogReuse.sourceRunId,
            linkedOffers: catalogReuse.inserted,
            totalOffers: catalogReuse.totalOffers,
          },
          'Scrape request served from catalog rematch',
        );

        return {
          ok: true,
          sourceRunId: catalogReuse.sourceRunId,
          status: 'reused',
          acceptedAt: catalogReuse.acceptedAt,
          inserted: catalogReuse.inserted,
          totalOffers: catalogReuse.totalOffers,
          reusedFromRunId: null,
          rematchedFromCatalog: true,
          traceId: catalogReuse.traceId,
          intentFingerprint,
          resolvedFromProfile,
          droppedFilters: normalizedFiltersResult.dropped,
          acceptedFilters: normalizedFilters ?? null,
        };
      }

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
          rematchedFromCatalog: false,
          traceId: reuse.traceId,
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
        traceId: jobSourceRunsTable.traceId,
        createdAt: jobSourceRunsTable.createdAt,
      });

    if (!run?.id) {
      throw new ServiceUnavailableException('Failed to create scrape run');
    }

    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'run_enqueued',
      requestId,
      message: 'Scrape run enqueued and waiting for worker dispatch.',
      meta: {
        source: sourceEnum,
        listingUrl,
        acceptedFilters: normalizedFilters ?? null,
        resolvedFromProfile,
      },
    });

    const workerTaskProvider = this.configService.get('WORKER_TASK_PROVIDER', { infer: true });
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
        taskSchemaVersion: WORKER_TASK_SCHEMA_VERSION,
        source,
        sourceRunId: run.id,
        traceId: run.traceId,
        requestId,
        dedupeKey: intentFingerprint,
        callbackUrl,
        heartbeatUrl,
        callbackToken,
        listingUrl,
        limit: dto.limit,
        userId,
        careerProfileId,
        filters: normalizedFilters,
        matchingFilters: normalizedMatchingFilters,
        adaptiveQueryWindow: this.resolveAdaptiveQueryWindow(),
      };
      const serializedPayload = JSON.stringify(workerPayload);
      const maxPayloadBytes = this.configService.get('WORKER_TASK_MAX_PAYLOAD_BYTES', { infer: true });
      const payloadBytes = Buffer.byteLength(serializedPayload);
      if (payloadBytes > maxPayloadBytes) {
        await this.markRunFailed(run.id, `Worker payload too large: ${payloadBytes} > ${maxPayloadBytes}`);
        await this.appendRunEvent({
          sourceRunId: run.id,
          traceId: run.traceId,
          eventType: 'worker_dispatch_failed',
          severity: 'error',
          requestId,
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Worker payload exceeded the configured size limit.',
          meta: {
            payloadBytes,
            maxPayloadBytes,
          },
        });
        throw new BadRequestException(`Worker payload exceeds max size (${maxPayloadBytes} bytes)`);
      }

      if (workerTaskProvider === 'cloud-tasks') {
        const cloudTask = await this.enqueueWorkerCloudTask(serializedPayload, requestId, workerUrl, authToken);
        await this.markRunRunning(run.id);
        await this.appendRunEvents([
          {
            sourceRunId: run.id,
            traceId: run.traceId,
            eventType: 'worker_task_dispatched',
            requestId,
            code: 'CLOUD_TASKS',
            message: 'Scrape run dispatched to Cloud Tasks.',
            meta: {
              provider: 'cloud-tasks',
              taskName: cloudTask.taskName,
              taskId: cloudTask.taskId,
            },
          },
          {
            sourceRunId: run.id,
            traceId: run.traceId,
            eventType: 'run_running',
            requestId,
            message: 'Scrape run accepted and marked RUNNING after Cloud Tasks dispatch.',
          },
        ]);
        this.logger.log(
          {
            requestId,
            sourceRunId: run.id,
            traceId: run.traceId,
            userId,
            queueProvider: 'cloud-tasks',
            taskName: cloudTask.taskName,
            taskId: cloudTask.taskId,
          },
          'Scrape run accepted by Cloud Tasks',
        );

        return {
          ok: true,
          sourceRunId: run.id,
          traceId: run.traceId,
          status: 'accepted',
          provider: 'cloud-tasks',
          taskName: cloudTask.taskName,
          taskId: cloudTask.taskId,
          dedupeKey: intentFingerprint,
          taskSchemaVersion: WORKER_TASK_SCHEMA_VERSION,
          acceptedAt: (run.createdAt ?? new Date()).toISOString(),
          droppedFilters: normalizedFiltersResult.dropped,
          acceptedFilters: normalizedFilters ?? null,
          intentFingerprint,
          resolvedFromProfile,
        };
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
        await this.appendRunEvent({
          sourceRunId: run.id,
          traceId: run.traceId,
          eventType: 'worker_dispatch_failed',
          severity: 'error',
          requestId,
          code: 'WORKER_HTTP_REJECTED',
          message: 'Worker rejected the scrape dispatch request.',
          meta: {
            workerUrl,
            responseText: text,
          },
        });
        throw new ServiceUnavailableException(reason);
      }

      const payload = text ? JSON.parse(text) : { ok: true };
      await this.markRunRunning(run.id);
      await this.appendRunEvents([
        {
          sourceRunId: run.id,
          traceId: run.traceId,
          eventType: 'worker_task_dispatched',
          requestId,
          code: 'WORKER_HTTP',
          message: 'Scrape run dispatched directly to worker over HTTP.',
          meta: {
            workerUrl,
          },
        },
        {
          sourceRunId: run.id,
          traceId: run.traceId,
          eventType: 'run_running',
          requestId,
          message: 'Scrape run accepted and marked RUNNING after worker dispatch.',
        },
      ]);
      this.logger.log(
        { requestId, sourceRunId: run.id, traceId: run.traceId, userId },
        'Scrape run accepted by worker',
      );
      if (Object.keys(normalizedFiltersResult.dropped).length > 0) {
        this.logger.warn(
          { requestId, sourceRunId: run.id, traceId: run.traceId, droppedFilters: normalizedFiltersResult.dropped },
          'Some scrape filters were dropped because they are unsupported for this source',
        );
      }

      return {
        ...payload,
        sourceRunId: run.id,
        traceId: run.traceId,
        status: 'accepted',
        provider: (payload?.queueProvider as string | undefined) ?? 'worker-http',
        dedupeKey: intentFingerprint,
        taskSchemaVersion: WORKER_TASK_SCHEMA_VERSION,
        acceptedAt: (run.createdAt ?? new Date()).toISOString(),
        droppedFilters: normalizedFiltersResult.dropped,
        acceptedFilters: normalizedFilters ?? null,
        intentFingerprint,
        resolvedFromProfile,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        await this.markRunRunning(run.id);
        await this.appendRunEvents([
          {
            sourceRunId: run.id,
            traceId: run.traceId,
            eventType: 'worker_dispatch_timed_out',
            severity: 'warning',
            requestId,
            message: 'Worker dispatch response timed out; run continues in background.',
          },
          {
            sourceRunId: run.id,
            traceId: run.traceId,
            eventType: 'run_running',
            requestId,
            severity: 'warning',
            message: 'Scrape run remains RUNNING after dispatch timeout.',
          },
        ]);
        this.logger.warn({ requestId, sourceRunId: run.id, traceId: run.traceId, userId }, 'Worker response timed out');
        return {
          ok: true,
          sourceRunId: run.id,
          traceId: run.traceId,
          status: 'accepted',
          provider: 'worker-http',
          dedupeKey: intentFingerprint,
          taskSchemaVersion: WORKER_TASK_SCHEMA_VERSION,
          acceptedAt: (run.createdAt ?? new Date()).toISOString(),
          warning: 'Worker response timed out. Scrape continues in background.',
          acceptedFilters: normalizedFilters ?? null,
          intentFingerprint,
          resolvedFromProfile,
        };
      }

      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'worker_dispatch_failed',
        severity: 'error',
        requestId,
        code: 'WORKER_DISPATCH_ERROR',
        message: 'Scrape dispatch failed before the worker accepted the run.',
        meta: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async enqueueWorkerCloudTask(
    serializedPayload: string,
    requestId: string,
    workerUrl: string,
    authToken?: string,
  ) {
    const projectId = this.configService.get('WORKER_TASKS_PROJECT_ID', { infer: true });
    const location = this.configService.get('WORKER_TASKS_LOCATION', { infer: true });
    const queue = this.configService.get('WORKER_TASKS_QUEUE', { infer: true });
    if (!projectId || !location || !queue) {
      throw new ServiceUnavailableException('Cloud Tasks provider is enabled but queue configuration is incomplete');
    }

    const parent = this.cloudTasksClient.queuePath(projectId, location, queue);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-id': requestId,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
    const serviceAccountEmail = this.configService.get('WORKER_TASKS_SERVICE_ACCOUNT_EMAIL', { infer: true });
    const oidcAudience = this.configService.get('WORKER_TASKS_OIDC_AUDIENCE', { infer: true }) ?? workerUrl;
    const [task] = await this.cloudTasksClient.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: workerUrl,
          headers,
          body: Buffer.from(serializedPayload).toString('base64'),
          oidcToken: serviceAccountEmail
            ? {
                serviceAccountEmail,
                audience: oidcAudience,
              }
            : undefined,
        },
      },
    });

    const taskName = task.name ?? null;
    const taskId = taskName ? (taskName.split('/').pop() ?? null) : null;
    return { taskName, taskId };
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
        traceId: jobSourceRunsTable.traceId,
        source: jobSourceRunsTable.source,
        userId: jobSourceRunsTable.userId,
        careerProfileId: jobSourceRunsTable.careerProfileId,
        status: jobSourceRunsTable.status,
        totalFound: jobSourceRunsTable.totalFound,
        scrapedCount: jobSourceRunsTable.scrapedCount,
        startedAt: jobSourceRunsTable.startedAt,
        failureType: jobSourceRunsTable.failureType,
        progress: jobSourceRunsTable.progress,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, dto.sourceRunId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const callbackAttemptNo = Math.max(1, dto.attemptNo ?? 1);
    const callbackProvidedPayloadHash = normalizeString(dto.payloadHash);
    const callbackPayloadHash = callbackProvidedPayloadHash ?? resolveCallbackPayloadHash(dto);
    const callbackEmittedAt = dto.emittedAt ? new Date(dto.emittedAt) : null;
    if (dto.emittedAt && Number.isNaN(callbackEmittedAt?.getTime())) {
      throw new BadRequestException('Invalid emittedAt timestamp');
    }

    if (callbackEventId) {
      const callbackEvent = await this.registerCallbackEvent(
        run.id,
        callbackEventId,
        dto,
        requestId,
        callbackAttemptNo,
        callbackProvidedPayloadHash,
        callbackEmittedAt,
      );
      if (!callbackEvent.accepted) {
        const reasonCode = (callbackEvent as Extract<CallbackEventRegisterResult, { accepted: false }>).reasonCode;
        this.logger.log(
          {
            requestId,
            sourceRunId: run.id,
            traceId: run.traceId,
            eventId: callbackEventId,
            idempotent: true,
            reasonCode,
          },
          'Duplicate callback event ignored',
        );
        return {
          ok: true,
          status: run.status,
          inserted: 0,
          idempotent: true,
          reasonCode,
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
        reasonCode: 'RUN_ALREADY_FINALIZED',
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
        reasonCode: 'RUN_FINALIZED_WITH_CONFLICTING_STATUS',
        warning: `Run already finalized as ${run.status}`,
      };
    }

    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'callback_received',
      requestId,
      attemptNo: callbackAttemptNo,
      code: dto.status ?? 'COMPLETED',
      message: 'Worker callback payload accepted for processing.',
      meta: {
        eventId: callbackEventId,
        payloadHash: callbackPayloadHash,
        emittedAt: callbackEmittedAt?.toISOString() ?? null,
      },
    });
    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'callback_accepted',
      requestId,
      attemptNo: callbackAttemptNo,
      code: dto.status ?? 'COMPLETED',
      message: 'Worker callback was accepted and passed idempotency validation.',
      meta: {
        eventId: callbackEventId,
        payloadHash: callbackPayloadHash,
      },
    });

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
      const classifiedOutcome = this.resolveClassifiedOutcome({
        status: 'FAILED',
        failureType,
        diagnostics: this.toNullableRecord(dto.diagnostics) ?? null,
        scrapedCount,
      });
      const emptyReason = normalizeScrapeEmptyReason(dto.diagnostics?.emptyReason ?? null);
      const sourceQuality = normalizeScrapeSourceQuality(dto.diagnostics?.sourceQuality ?? null) ?? 'failed';
      await this.registerRunAttempt(run.id, callbackAttemptNo, {
        status: 'FAILED',
        payloadHash: callbackPayloadHash,
        emittedAt: callbackEmittedAt,
        completedAt,
        failureType,
        failureCode: dto.failureCode ?? null,
        error: dto.error ?? 'Scrape failed in worker',
      });
      await this.transitionRunStatus(run.id, run.status as RunStatus, 'FAILED', {
        scrapedCount,
        totalFound,
        error: dto.error ?? 'Scrape failed in worker',
        failureType,
        classifiedOutcome,
        emptyReason,
        sourceQuality,
        finalizedAt: completedAt,
        completedAt,
      });
      this.logger.warn(
        {
          requestId,
          sourceRunId: run.id,
          traceId: run.traceId,
          statusFrom,
          statusTo: 'FAILED',
          failureType,
          totalFound,
          scrapedCount,
          durationMs: this.resolveRunDurationMs(run.startedAt ?? null, completedAt),
        },
        'Scrape run finalized as FAILED',
      );
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'callback_failed',
        requestId,
        severity: 'error',
        attemptNo: callbackAttemptNo,
        code: dto.failureCode ?? failureType,
        message: 'Worker callback finalized the scrape run as FAILED.',
        meta: {
          eventId: callbackEventId,
          totalFound,
          scrapedCount,
          error: dto.error ?? 'Scrape failed in worker',
          failureType,
        },
      });

      return {
        ok: true,
        status: 'FAILED',
        inserted: 0,
        idempotent: run.status === 'FAILED',
      };
    }

    if (sanitizedJobs.length) {
      const now = new Date();
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'catalog_upsert_started',
        requestId,
        attemptNo: callbackAttemptNo,
        message: 'Persisting accepted scrape offers into the shared catalog.',
        meta: {
          acceptedOfferCount: sanitizedJobs.length,
          rejectedOfferCount: dto.diagnostics?.rejectedOfferCount ?? 0,
          rejectedOfferReasons: dto.diagnostics?.rejectedOfferReasons ?? {},
        },
      });
      const jobsToPersist = await this.reuseExistingUrlsBySourceId(run.source, sanitizedJobs);
      const cols = getTableColumns(jobOffersTable);
      const catalogOfferValues: JobOfferInsert[] = jobsToPersist.map((job) => ({
        source: run.source,
        sourceId: job.sourceId ?? null,
        offerIdentityKey: computeOfferIdentityKey({
          sourceId: job.sourceId ?? null,
          url: job.url,
        }),
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
        contentHash: this.computeCatalogContentHash(job),
        qualityState: ACCEPTED_QUALITY_STATE,
        qualityReason: job.tags?.includes('listing-salvage') ? 'listing_salvage' : null,
        isExpired: job.isExpired ?? false,
        expiresAt: job.isExpired ? now : null,
        lastFullScrapeAt: now,
        firstSeenAt: now,
        lastSeenAt: now,
        fetchedAt: now,
      }));

      const persistedOffers = await this.db
        .insert(jobOffersTable)
        .values(catalogOfferValues)
        .onConflictDoUpdate({
          target: [jobOffersTable.source, jobOffersTable.offerIdentityKey],
          set: {
            runId: run.id,
            sourceId: sql`CASE
              WHEN ${excludedColumn(cols.sourceId)} IS NOT NULL AND ${excludedColumn(cols.sourceId)} != ''
              THEN ${excludedColumn(cols.sourceId)}
              ELSE ${jobOffersTable.sourceId}
            END`,
            title: sql`CASE
              WHEN ${excludedColumn(cols.title)} IS NOT NULL AND ${excludedColumn(cols.title)} != '' AND ${excludedColumn(cols.title)} != 'Unknown title'
              THEN ${excludedColumn(cols.title)}
              ELSE ${jobOffersTable.title}
            END`,
            company: sql`CASE
              WHEN ${excludedColumn(cols.company)} IS NOT NULL AND ${excludedColumn(cols.company)} != ''
              THEN ${excludedColumn(cols.company)}
              ELSE ${jobOffersTable.company}
            END`,
            location: sql`CASE
              WHEN ${excludedColumn(cols.location)} IS NOT NULL AND ${excludedColumn(cols.location)} != ''
              THEN ${excludedColumn(cols.location)}
              ELSE ${jobOffersTable.location}
            END`,
            salary: sql`CASE
              WHEN ${excludedColumn(cols.salary)} IS NOT NULL AND ${excludedColumn(cols.salary)} != ''
              THEN ${excludedColumn(cols.salary)}
              ELSE ${jobOffersTable.salary}
            END`,
            employmentType: sql`CASE
              WHEN ${excludedColumn(cols.employmentType)} IS NOT NULL AND ${excludedColumn(cols.employmentType)} != ''
              THEN ${excludedColumn(cols.employmentType)}
              ELSE ${jobOffersTable.employmentType}
            END`,
            description: sql`CASE
              WHEN ${excludedColumn(cols.description)} IS NOT NULL
               AND ${excludedColumn(cols.description)} != ''
               AND ${excludedColumn(cols.description)} != 'No description found'
               AND ${excludedColumn(cols.description)} != 'Listing summary only'
              THEN ${excludedColumn(cols.description)}
              ELSE ${jobOffersTable.description}
            END`,
            requirements: sql`CASE
              WHEN ${excludedColumn(cols.requirements)} IS NOT NULL THEN ${excludedColumn(cols.requirements)}
              ELSE ${jobOffersTable.requirements}
            END`,
            details: sql`CASE
              WHEN ${excludedColumn(cols.details)} IS NOT NULL THEN ${excludedColumn(cols.details)}
              ELSE ${jobOffersTable.details}
            END`,
            isExpired: excludedColumn(cols.isExpired),
            expiresAt: sql`CASE
              WHEN ${excludedColumn(cols.isExpired)} = TRUE AND ${jobOffersTable.expiresAt} IS NULL
              THEN ${excludedColumn(cols.expiresAt)}
              ELSE ${jobOffersTable.expiresAt}
            END`,
            lastFullScrapeAt: excludedColumn(cols.lastFullScrapeAt),
            contentHash: sql`CASE
              WHEN length(coalesce(${excludedColumn(cols.description)}, '')) > length(coalesce(${jobOffersTable.description}, ''))
              THEN ${excludedColumn(cols.contentHash)}
              ELSE coalesce(${jobOffersTable.contentHash}, ${excludedColumn(cols.contentHash)})
            END`,
            qualityState: sql`CASE
              WHEN ${excludedColumn(cols.isExpired)} = TRUE THEN ${jobOffersTable.qualityState}
              ELSE ${excludedColumn(cols.qualityState)}
            END`,
            qualityReason: sql`CASE
              WHEN ${excludedColumn(cols.qualityReason)} IS NOT NULL THEN ${excludedColumn(cols.qualityReason)}
              ELSE ${jobOffersTable.qualityReason}
            END`,
            firstSeenAt: sql`least(${jobOffersTable.firstSeenAt}, ${excludedColumn(cols.firstSeenAt)})`,
            lastSeenAt: excludedColumn(cols.lastSeenAt),
            fetchedAt: now,
          },
        })
        .returning({ id: jobOffersTable.id });

      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'catalog_upsert_completed',
        requestId,
        attemptNo: callbackAttemptNo,
        message: 'Accepted scrape offers were persisted into the shared catalog.',
        meta: {
          catalogOfferCount: persistedOffers.length,
        },
      });
    }

    const finalizedAt = new Date();
    let statusForCompletion = run.status as RunStatus;
    if (statusForCompletion === 'PENDING') {
      await this.transitionRunStatus(run.id, 'PENDING', 'RUNNING', {
        error: null,
        failureType: null,
        finalizedAt: null,
        startedAt: callbackEmittedAt ?? finalizedAt,
      });
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'run_running',
        requestId,
        attemptNo: callbackAttemptNo,
        message: 'Pending run promoted to RUNNING before callback finalization.',
      });
      statusForCompletion = 'RUNNING';
    }
    await this.registerRunAttempt(run.id, callbackAttemptNo, {
      status: 'COMPLETED',
      payloadHash: callbackPayloadHash,
      emittedAt: callbackEmittedAt,
      completedAt: finalizedAt,
      failureType: null,
      failureCode: null,
      error: null,
    });
    const completedOutcome = this.resolveCompletedCallbackOutcome({
      diagnostics: this.toNullableRecord(dto.diagnostics) ?? null,
      scrapedCount,
      totalFound,
    });
    await this.transitionRunStatus(run.id, statusForCompletion, 'COMPLETED', {
      scrapedCount,
      totalFound,
      error: null,
      failureType: null,
      classifiedOutcome: completedOutcome.classifiedOutcome,
      emptyReason: completedOutcome.emptyReason,
      sourceQuality: completedOutcome.sourceQuality,
      finalizedAt,
      completedAt: finalizedAt,
    });

    if (!run.userId || !run.careerProfileId) {
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'user_link_skipped',
        requestId,
        attemptNo: callbackAttemptNo,
        severity: 'warning',
        message: 'Notebook linking skipped because the run is missing user or career profile context.',
      });
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
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'catalog_candidates_empty',
        requestId,
        attemptNo: callbackAttemptNo,
        severity: 'warning',
        message: 'Scrape callback completed but produced no persisted catalog candidates for notebook linking.',
        meta: {
          totalFound,
          scrapedCount,
        },
      });
      return {
        ok: true,
        status: 'COMPLETED',
        inserted: 0,
        totalOffers: 0,
        idempotent: true,
      };
    }

    const profileContext = await this.getCareerProfileContext(run.userId, run.careerProfileId);
    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'user_link_started',
      requestId,
      attemptNo: callbackAttemptNo,
      message: 'Linking persisted catalog offers into the user notebook.',
      meta: {
        candidateOffers: offers.length,
        origin: 'SCRAPE',
      },
    });
    const inserted = profileContext.profile
      ? await this.linkCatalogOffersToUser({
          userId: run.userId,
          careerProfileId: run.careerProfileId,
          sourceRunId: run.id,
          source: run.source,
          profile: profileContext.profile,
          specificOfferIds: offers.map((offer) => offer.id),
          origin: 'SCRAPE',
        })
      : {
          insertedCount: 0,
          totalCandidateCount: offers.length,
          matchedCount: 0,
        };
    await this.db
      .update(jobSourceRunsTable)
      .set({
        progress: {
          ...(((run.progress as Record<string, unknown> | null) ?? {}) as Record<string, unknown>),
          totalFound,
          scrapedCount,
          candidateOffers: offers.length,
          matchedOffers: inserted.matchedCount,
          userInsertedOffers: inserted.insertedCount,
          callbackAcceptedAt: finalizedAt.toISOString(),
          updatedAt: finalizedAt.toISOString(),
        },
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    this.logger.log(
      {
        requestId,
        sourceRunId: run.id,
        traceId: run.traceId,
        statusFrom,
        statusTo: 'COMPLETED',
        totalFound,
        scrapedCount,
        offersInserted: inserted.insertedCount,
      },
      'Scrape run finalized as COMPLETED',
    );
    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'callback_completed',
      requestId,
      attemptNo: callbackAttemptNo,
      code: 'COMPLETED',
      message: 'Worker callback finalized the scrape run as COMPLETED.',
      meta: {
        eventId: callbackEventId,
        totalFound,
        scrapedCount,
        offersInserted: inserted.insertedCount,
      },
    });
    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'user_link_completed',
      requestId,
      attemptNo: callbackAttemptNo,
      message: 'Catalog offers were linked to the user notebook.',
      meta: {
        candidateOffers: offers.length,
        matchedOffers: inserted.matchedCount,
        insertedOffers: inserted.insertedCount,
        origin: 'SCRAPE',
      },
    });

    return {
      ok: true,
      status: 'COMPLETED',
      inserted: inserted.insertedCount,
      totalOffers: offers.length,
      idempotent: inserted.insertedCount === 0,
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
        traceId: jobSourceRunsTable.traceId,
        status: jobSourceRunsTable.status,
        progress: jobSourceRunsTable.progress,
        lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
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
    const previousProgress =
      run.progress && typeof run.progress === 'object' && !Array.isArray(run.progress)
        ? (run.progress as Record<string, unknown>)
        : null;
    const previousComparable = previousProgress
      ? {
          phase: previousProgress.phase ?? null,
          attempt: previousProgress.attempt ?? null,
          pagesVisited: previousProgress.pagesVisited ?? 0,
          jobLinksDiscovered: previousProgress.jobLinksDiscovered ?? 0,
          normalizedOffers: previousProgress.normalizedOffers ?? 0,
          meta: previousProgress.meta ?? null,
        }
      : null;
    const nextComparable = {
      phase: progress.phase,
      attempt: progress.attempt,
      pagesVisited: progress.pagesVisited,
      jobLinksDiscovered: progress.jobLinksDiscovered,
      normalizedOffers: progress.normalizedOffers,
      meta: progress.meta,
    };
    const suppressHeartbeatEvent =
      previousComparable &&
      stableJson(previousComparable) === stableJson(nextComparable) &&
      run.lastHeartbeatAt instanceof Date &&
      now.getTime() - run.lastHeartbeatAt.getTime() < HEARTBEAT_EVENT_DEDUP_WINDOW_MS;

    const resolvedStatus = run.status === 'PENDING' ? 'RUNNING' : (run.status as RunStatus);
    const nextRunUpdate: {
      status?: RunStatus;
      error?: string | null;
      failureType?: string | null;
      finalizedAt?: Date | null;
      lastHeartbeatAt: Date;
      progress?: Record<string, unknown>;
    } = {
      lastHeartbeatAt: now,
    };
    if (run.status === 'PENDING') {
      nextRunUpdate.status = resolvedStatus;
      nextRunUpdate.error = null;
      nextRunUpdate.failureType = null;
      nextRunUpdate.finalizedAt = null;
      nextRunUpdate.progress = progress;
    } else if (!suppressHeartbeatEvent) {
      nextRunUpdate.status = resolvedStatus;
      nextRunUpdate.error = null;
      nextRunUpdate.failureType = null;
      nextRunUpdate.finalizedAt = null;
      nextRunUpdate.progress = progress;
    }
    await this.db.update(jobSourceRunsTable).set(nextRunUpdate).where(eq(jobSourceRunsTable.id, run.id));

    if (!suppressHeartbeatEvent) {
      await this.appendRunEvent({
        sourceRunId: run.id,
        traceId: run.traceId,
        eventType: 'heartbeat_received',
        requestId,
        phase: dto.phase ?? null,
        attemptNo: dto.attempt ?? null,
        message: 'Worker heartbeat accepted for active scrape run.',
        meta: {
          pagesVisited: dto.pagesVisited ?? 0,
          jobLinksDiscovered: dto.jobLinksDiscovered ?? 0,
          normalizedOffers: dto.normalizedOffers ?? 0,
          progressMeta: dto.meta ?? null,
        },
      });
    }

    return {
      ok: true,
      status: resolvedStatus,
      heartbeatAt: now.toISOString(),
      deduped: suppressHeartbeatEvent,
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
      if (!payload.iss || !WORKER_OIDC_ISSUERS.has(payload.iss)) {
        throw new UnauthorizedException('Invalid worker callback OIDC issuer');
      }
      const expectedEmail = this.configService.get('WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL', { infer: true });
      if (expectedEmail && payload.email !== expectedEmail) {
        throw new UnauthorizedException('Invalid worker callback service account');
      }
      if (expectedEmail && payload.email_verified !== true) {
        throw new UnauthorizedException('Unverified worker callback service account email');
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

  private toNullableRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private normalizeRunEventMeta(value: Record<string, unknown> | null | undefined) {
    if (!value) {
      return null;
    }

    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Record<
      string,
      unknown
    > | null;
  }

  private safeParseJson(value: string | null | undefined) {
    if (!value?.trim()) {
      return null;
    }

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private resolveClassifiedOutcome(input: {
    status: RunStatus;
    failureType: RunFailureType | null;
    diagnostics: Record<string, unknown> | null;
    scrapedCount?: number | null;
  }) {
    return classifyScrapeOutcome({
      status: input.status,
      failureType: input.failureType ?? undefined,
      resultKind: normalizeScrapeResultKind(input.diagnostics?.resultKind as string | null | undefined),
      emptyReason: normalizeScrapeEmptyReason(input.diagnostics?.emptyReason as string | null | undefined),
      scrapedCount: input.scrapedCount ?? 0,
      failureReason: typeof input.diagnostics?.failureReason === 'string' ? input.diagnostics.failureReason : undefined,
    });
  }

  private resolveImmediateCompletedOutcome(input: { totalFound: number; matchedCount: number; insertedCount: number }) {
    const totalFound = Math.max(0, input.totalFound);
    const matchedCount = Math.max(0, input.matchedCount);
    const insertedCount = Math.max(0, input.insertedCount);
    const diagnostics: Record<string, unknown> =
      totalFound === 0
        ? { resultKind: 'empty', emptyReason: 'no_listings' }
        : matchedCount === 0
          ? { resultKind: 'empty', emptyReason: 'filters_exhausted' }
          : { resultKind: 'healthy' };

    const classifiedOutcome =
      totalFound > 0 && matchedCount > 0
        ? 'success'
        : this.resolveClassifiedOutcome({
            status: 'COMPLETED',
            failureType: null,
            diagnostics,
            scrapedCount: insertedCount,
          });

    return {
      classifiedOutcome,
      emptyReason: normalizeScrapeEmptyReason(
        typeof diagnostics.emptyReason === 'string' ? diagnostics.emptyReason : null,
      ),
      sourceQuality: totalFound === 0 || matchedCount === 0 ? ('empty' as const) : ('healthy' as const),
      progress: {
        totalFound,
        matchedOffers: matchedCount,
        userInsertedOffers: insertedCount,
      },
    };
  }

  private resolveCompletedCallbackOutcome(input: {
    diagnostics: Record<string, unknown> | null;
    scrapedCount: number;
    totalFound: number | null;
  }) {
    const diagnostics = input.diagnostics ?? {};
    const derivedDiagnostics =
      Object.keys(diagnostics).length > 0
        ? diagnostics
        : input.scrapedCount > 0
          ? ({ resultKind: 'healthy' } satisfies Record<string, unknown>)
          : (input.totalFound ?? 0) > 0
            ? ({ resultKind: 'empty', emptyReason: 'detail_parse_gap' } satisfies Record<string, unknown>)
            : ({ resultKind: 'empty', emptyReason: 'no_listings' } satisfies Record<string, unknown>);

    const emptyReason =
      normalizeScrapeEmptyReason(String(derivedDiagnostics.emptyReason ?? '')) ??
      ((input.scrapedCount ?? 0) === 0 && (input.totalFound ?? 0) > 0 ? 'detail_parse_gap' : null);
    const sourceQuality =
      normalizeScrapeSourceQuality(String(derivedDiagnostics.sourceQuality ?? '')) ??
      (input.scrapedCount > 0
        ? ('healthy' as const)
        : emptyReason === 'detail_parse_gap'
          ? ('degraded' as const)
          : ('empty' as const));

    return {
      classifiedOutcome: this.resolveClassifiedOutcome({
        status: 'COMPLETED',
        failureType: null,
        diagnostics: derivedDiagnostics,
        scrapedCount: input.scrapedCount,
      }),
      emptyReason,
      sourceQuality,
    };
  }

  private extractEventMeta(meta: unknown) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      return null;
    }
    return meta as Record<string, unknown>;
  }

  private buildTransportSummary(executionEvents: ExecutionEventSnapshot[]) {
    const fallbackReasons = Array.from(
      new Set(
        executionEvents
          .filter((event) => event.code === 'LISTING_FALLBACK_TRIGGERED')
          .map((event) => {
            const reason = this.extractEventMeta(event.meta)?.reason;
            return typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null;
          })
          .filter((item): item is string => Boolean(item)),
      ),
    );
    const httpCompleted = executionEvents.some((event) => event.code === 'LISTING_HTTP_FETCH_COMPLETED');
    const fallbackTriggered = executionEvents.some((event) => event.code === 'LISTING_FALLBACK_TRIGGERED');
    const browserNavigationCompleted = executionEvents.some(
      (event) => event.code === 'LISTING_BROWSER_NAVIGATION_COMPLETED',
    );
    const browserLaunchCompleted = executionEvents.some((event) => event.code === 'LISTING_BROWSER_LAUNCH_COMPLETED');

    const listingTransport: 'http' | 'browser' | 'http->browser' | 'unknown' = fallbackTriggered
      ? 'http->browser'
      : browserNavigationCompleted
        ? 'browser'
        : httpCompleted
          ? 'http'
          : 'unknown';

    if (
      listingTransport === 'unknown' &&
      !fallbackTriggered &&
      !browserLaunchCompleted &&
      fallbackReasons.length === 0
    ) {
      return null;
    }

    return {
      listingTransport,
      browserFallbackUsed: fallbackTriggered || browserNavigationCompleted || browserLaunchCompleted,
      browserLaunchSucceeded: browserLaunchCompleted,
      fallbackReasons,
    };
  }

  private buildBrowserSummary(executionEvents: ExecutionEventSnapshot[]) {
    const launchStartedEvents = executionEvents.filter((event) => event.code === 'LISTING_BROWSER_LAUNCH_STARTED');
    const launchRetryEvents = executionEvents.filter((event) => event.code === 'LISTING_BROWSER_LAUNCH_RETRY');
    const launchCompletedEvent = executionEvents.find((event) => event.code === 'LISTING_BROWSER_LAUNCH_COMPLETED');
    const launchFailedEvent = executionEvents.find((event) => event.code === 'LISTING_BROWSER_LAUNCH_FAILED');
    const readyTimeoutEvent = executionEvents.find((event) => event.code === 'LISTING_BROWSER_READY_TIMEOUT');
    const navigationCompletedEvent = executionEvents.find(
      (event) => event.code === 'LISTING_BROWSER_NAVIGATION_COMPLETED',
    );
    const navigationFailedEvent = executionEvents.find((event) => event.code === 'LISTING_BROWSER_NAVIGATION_FAILED');

    const terminalEvent = launchFailedEvent ?? readyTimeoutEvent ?? navigationFailedEvent ?? null;
    const launchMeta = this.extractEventMeta(launchCompletedEvent?.meta ?? launchStartedEvents[0]?.meta ?? null);
    const terminalMeta = this.extractEventMeta(terminalEvent?.meta ?? null);
    const launchArgs = Array.isArray(launchMeta?.args)
      ? launchMeta.args.filter((item): item is string => typeof item === 'string')
      : [];
    const launchDurationMs =
      typeof launchMeta?.durationMs === 'number'
        ? launchMeta.durationMs
        : typeof terminalMeta?.durationMs === 'number'
          ? terminalMeta.durationMs
          : null;
    const channel =
      typeof launchMeta?.channel === 'string'
        ? launchMeta.channel
        : typeof terminalMeta?.channel === 'string'
          ? terminalMeta.channel
          : null;
    const failureReason =
      typeof terminalMeta?.error === 'string' ? terminalMeta.error : readyTimeoutEvent ? 'browser_ready_timeout' : null;

    if (
      launchStartedEvents.length === 0 &&
      launchRetryEvents.length === 0 &&
      !launchCompletedEvent &&
      !terminalEvent &&
      !navigationCompletedEvent
    ) {
      return null;
    }

    return {
      launchAttempts: Math.max(
        launchStartedEvents.length,
        launchRetryEvents.length +
          (launchStartedEvents.length > 0 || launchCompletedEvent || launchFailedEvent ? 1 : 0),
      ),
      launchRetries: launchRetryEvents.length,
      launchDurationMs,
      launchArgs,
      channel,
      launchSucceeded: Boolean(launchCompletedEvent),
      readyTimedOut: Boolean(readyTimeoutEvent),
      navigationSucceeded: Boolean(navigationCompletedEvent),
      failureReason,
    };
  }

  private async updateImmediateCompletedRun(input: {
    runId: string;
    totalFound: number;
    matchedCount: number;
    insertedCount: number;
  }) {
    const outcome = this.resolveImmediateCompletedOutcome(input);
    await this.db
      .update(jobSourceRunsTable)
      .set({
        totalFound: input.totalFound,
        scrapedCount: input.insertedCount,
        classifiedOutcome: outcome.classifiedOutcome,
        emptyReason: outcome.emptyReason,
        sourceQuality: outcome.sourceQuality,
        progress: outcome.progress,
      })
      .where(eq(jobSourceRunsTable.id, input.runId));
  }

  private async appendRunEvent(input: RunEventInput) {
    try {
      await this.db.insert(jobSourceRunEventsTable).values({
        sourceRunId: input.sourceRunId,
        traceId: input.traceId,
        eventType: input.eventType,
        severity: input.severity ?? 'info',
        requestId: input.requestId ?? null,
        phase: input.phase ?? null,
        attemptNo: input.attemptNo ?? null,
        code: input.code ?? null,
        message: input.message,
        meta: this.normalizeRunEventMeta(input.meta) ?? null,
        createdAt: input.createdAt ?? new Date(),
      });
    } catch (error) {
      this.logger.warn(
        {
          sourceRunId: input.sourceRunId,
          traceId: input.traceId,
          eventType: input.eventType,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to persist scrape run event',
      );
    }
  }

  private async appendRunEvents(inputs: RunEventInput[]) {
    for (const input of inputs) {
      await this.appendRunEvent(input);
    }
  }

  private async appendScheduleEvent(input: ScheduleEventInput) {
    try {
      await this.db.insert(scrapeScheduleEventsTable).values({
        scheduleId: input.scheduleId,
        userId: input.userId,
        sourceRunId: input.sourceRunId ?? null,
        traceId: input.traceId ?? null,
        requestId: input.requestId ?? null,
        eventType: input.eventType,
        severity: input.severity ?? 'info',
        code: input.code ?? null,
        message: input.message,
        meta: this.normalizeRunEventMeta(input.meta) ?? null,
        createdAt: input.createdAt ?? new Date(),
      });
    } catch (error) {
      this.logger.warn(
        {
          scheduleId: input.scheduleId,
          userId: input.userId,
          eventType: input.eventType,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to persist scrape schedule event',
      );
    }
  }

  private async appendScheduleEvents(inputs: ScheduleEventInput[]) {
    for (const input of inputs) {
      await this.appendScheduleEvent(input);
    }
  }

  async listRuns(userId: string, query: ListJobSourceRunsQuery) {
    await this.reconcileStaleRuns(userId);
    const conditions = [eq(jobSourceRunsTable.userId, userId)];
    const windowHours = Math.min(Math.max(query.windowHours ?? 168, 1), 720);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    conditions.push(gte(jobSourceRunsTable.createdAt, cutoff));
    if (query.status) {
      conditions.push(eq(jobSourceRunsTable.status, query.status as JobSourceRunStatus));
    }
    if (query.retriedFrom) {
      conditions.push(eq(jobSourceRunsTable.retryOfRunId, query.retriedFrom));
    }
    if (query.failureType) {
      conditions.push(eq(jobSourceRunsTable.failureType, query.failureType));
    }
    if (query.source) {
      conditions.push(eq(jobSourceRunsTable.source, query.source));
    }
    if (query.includeRetried === false) {
      conditions.push(isNull(jobSourceRunsTable.retryOfRunId));
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

  async exportRunsCsv(userId: string, query: ListJobSourceRunsQuery) {
    const data = await this.listRuns(userId, {
      ...query,
      limit: Math.min(query.limit ?? 200, 500),
      offset: query.offset ?? 0,
    });

    const header = [
      'id',
      'source',
      'status',
      'failureType',
      'retryCount',
      'retryOfRunId',
      'totalFound',
      'scrapedCount',
      'createdAt',
      'finalizedAt',
      'lastHeartbeatAt',
      'listingUrl',
      'error',
    ];

    const rows = data.items.map((item) =>
      [
        item.id,
        item.source,
        item.status,
        item.failureType ?? '',
        item.retryCount ?? 0,
        item.retryOfRunId ?? '',
        item.totalFound ?? '',
        item.scrapedCount ?? '',
        item.createdAt?.toISOString?.() ?? item.createdAt,
        item.finalizedAt?.toISOString?.() ?? item.finalizedAt ?? '',
        item.lastHeartbeatAt?.toISOString?.() ?? item.lastHeartbeatAt ?? '',
        item.listingUrl,
        item.error ?? '',
      ]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  async getSourceHealth(userId: string, windowHoursInput?: number) {
    await this.reconcileStaleRuns(userId);
    const windowHours = Math.min(Math.max(Number(windowHoursInput ?? 72), 1), 168);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const staleHeartbeatCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const runs = await this.db
      .select({
        source: jobSourceRunsTable.source,
        status: jobSourceRunsTable.status,
        failureType: jobSourceRunsTable.failureType,
        classifiedOutcome: jobSourceRunsTable.classifiedOutcome,
        sourceQuality: jobSourceRunsTable.sourceQuality,
        createdAt: jobSourceRunsTable.createdAt,
        lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
      })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.userId, userId), gte(jobSourceRunsTable.createdAt, cutoff)));

    const grouped = new Map<
      string,
      {
        source: string;
        totalRuns: number;
        completedRuns: number;
        failedRuns: number;
        timeoutFailures: number;
        callbackFailures: number;
        networkFailures: number;
        parseFailures: number;
        validationFailures: number;
        unknownFailures: number;
        staleHeartbeatRuns: number;
        degradedRuns: number;
        emptyRuns: number;
        failedQualityRuns: number;
        partialSuccessRuns: number;
        blockedOutcomeRuns: number;
        listingEmptyRuns: number;
        filtersExhaustedRuns: number;
        detailParseGapRuns: number;
        latestRunAt: Date | null;
        latestRunStatus: string | null;
      }
    >();

    for (const run of runs) {
      const source = run.source;
      const current = grouped.get(source) ?? {
        source,
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        timeoutFailures: 0,
        callbackFailures: 0,
        networkFailures: 0,
        parseFailures: 0,
        validationFailures: 0,
        unknownFailures: 0,
        staleHeartbeatRuns: 0,
        degradedRuns: 0,
        emptyRuns: 0,
        failedQualityRuns: 0,
        partialSuccessRuns: 0,
        blockedOutcomeRuns: 0,
        listingEmptyRuns: 0,
        filtersExhaustedRuns: 0,
        detailParseGapRuns: 0,
        latestRunAt: null,
        latestRunStatus: null,
      };
      current.totalRuns += 1;
      current.completedRuns += run.status === 'COMPLETED' ? 1 : 0;
      current.failedRuns += run.status === 'FAILED' ? 1 : 0;
      current.timeoutFailures += run.failureType === 'timeout' ? 1 : 0;
      current.callbackFailures += run.failureType === 'callback' ? 1 : 0;
      current.networkFailures += run.failureType === 'network' ? 1 : 0;
      current.parseFailures += run.failureType === 'parse' ? 1 : 0;
      current.validationFailures += run.failureType === 'validation' ? 1 : 0;
      current.unknownFailures += !run.failureType || run.failureType === 'unknown' ? 1 : 0;
      current.staleHeartbeatRuns +=
        run.status === 'RUNNING' && run.lastHeartbeatAt != null && run.lastHeartbeatAt < staleHeartbeatCutoff ? 1 : 0;
      current.degradedRuns += run.sourceQuality === 'degraded' ? 1 : 0;
      current.emptyRuns += run.sourceQuality === 'empty' ? 1 : 0;
      current.failedQualityRuns += run.sourceQuality === 'failed' ? 1 : 0;
      current.partialSuccessRuns += run.classifiedOutcome === 'partial_success' ? 1 : 0;
      current.blockedOutcomeRuns += run.classifiedOutcome === 'blocked_by_source' ? 1 : 0;
      current.listingEmptyRuns += run.classifiedOutcome === 'listing_empty' ? 1 : 0;
      current.filtersExhaustedRuns += run.classifiedOutcome === 'filters_exhausted' ? 1 : 0;
      current.detailParseGapRuns += run.classifiedOutcome === 'detail_parse_gap' ? 1 : 0;
      if (!current.latestRunAt || run.createdAt > current.latestRunAt) {
        current.latestRunAt = run.createdAt;
        current.latestRunStatus = run.status;
      }
      grouped.set(source, current);
    }

    return {
      windowHours,
      items: Array.from(grouped.values()).map((item) => ({
        ...item,
        successRate: item.totalRuns ? Number((item.completedRuns / item.totalRuns).toFixed(4)) : 0,
      })),
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
        filters: run.filters as Record<string, unknown> | undefined as ScrapeFiltersDto | undefined,
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

    const retriedRun = await this.db
      .select({
        traceId: jobSourceRunsTable.traceId,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, result.sourceRunId))
      .limit(1)
      .then(([item]) => item);

    if (retriedRun?.traceId) {
      await this.appendRunEvent({
        sourceRunId: result.sourceRunId,
        traceId: retriedRun.traceId,
        eventType: 'run_retried',
        requestId,
        code: 'MANUAL_RETRY',
        message: 'Failed scrape run was retried from the UI/API.',
        meta: {
          retriedFromRunId: run.id,
          retryCount: nextRetryCount,
        },
      });
    }

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

    let callbackSummary:
      | {
          total: number;
          latestReceivedAt: Date | null;
        }
      | undefined;
    try {
      callbackSummary = await this.db
        .select({
          total: sql<number>`count(*)`,
          latestReceivedAt: sql<Date | null>`max(${jobSourceCallbackEventsTable.receivedAt})`,
        })
        .from(jobSourceCallbackEventsTable)
        .where(eq(jobSourceCallbackEventsTable.sourceRunId, runId))
        .then(([item]) => item);
    } catch {
      callbackSummary = undefined;
    }

    let latestRunEvent:
      | {
          createdAt: Date;
          code: string | null;
        }
      | undefined;
    try {
      latestRunEvent = await this.db
        .select({
          createdAt: jobSourceRunEventsTable.createdAt,
          code: jobSourceRunEventsTable.code,
        })
        .from(jobSourceRunEventsTable)
        .where(eq(jobSourceRunEventsTable.sourceRunId, runId))
        .orderBy(desc(jobSourceRunEventsTable.createdAt))
        .limit(1)
        .then(([item]) => item);
    } catch {
      latestRunEvent = undefined;
    }

    const diagnostics = (parsedPayload?.diagnostics as Record<string, unknown> | undefined) ?? {};
    let executionEvents: Array<{
      stage: string;
      status: string;
      code: string | null;
      meta: unknown;
    }> = [];
    try {
      executionEvents = await this.db
        .select({
          stage: scrapeExecutionEventsTable.stage,
          status: scrapeExecutionEventsTable.status,
          code: scrapeExecutionEventsTable.code,
          meta: scrapeExecutionEventsTable.meta,
        })
        .from(scrapeExecutionEventsTable)
        .where(eq(scrapeExecutionEventsTable.sourceRunId, runId));
    } catch {
      executionEvents = [];
    }
    const executionStages = Array.from(
      executionEvents
        .reduce<Map<string, { stage: string; total: number; failed: number; warning: number }>>((acc, event) => {
          const current = acc.get(event.stage) ?? { stage: event.stage, total: 0, failed: 0, warning: 0 };
          current.total += 1;
          if (event.status === 'failed') {
            current.failed += 1;
          }
          if (event.status === 'warning') {
            current.warning += 1;
          }
          acc.set(event.stage, current);
          return acc;
        }, new Map())
        .values(),
    );
    const transportSummary = this.buildTransportSummary(executionEvents);
    const browserSummary = this.buildBrowserSummary(executionEvents);
    const classifiedOutcome =
      normalizeString(run.classifiedOutcome) ??
      normalizeString(String(diagnostics.resultKind ?? '')) ??
      (run.status === 'COMPLETED' ? 'success' : deriveFailureType(run.error));

    return {
      runId: run.id,
      traceId: run.traceId,
      source: run.source,
      status: run.status,
      listingUrl: run.listingUrl,
      finalizedAt: run.finalizedAt ?? run.completedAt,
      heartbeatAt: run.lastHeartbeatAt ?? null,
      callbackAttempts: Number(callbackSummary?.total ?? 0),
      callbackAcceptedAt: callbackSummary?.latestReceivedAt ?? null,
      reconcileReason:
        run.status === 'FAILED' && run.error === '[timeout] run stale watchdog' ? 'STALE_HEARTBEAT_OR_CALLBACK' : null,
      lastEventAt: latestRunEvent?.createdAt ?? null,
      progress: (run.progress as Record<string, unknown> | null) ?? null,
      executionStages,
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
        resultKind: normalizeString(String(diagnostics.resultKind ?? '')) ?? normalizeString(run.classifiedOutcome),
        emptyReason:
          normalizeScrapeEmptyReason(String(diagnostics.emptyReason ?? '')) ??
          normalizeScrapeEmptyReason(run.emptyReason),
        sourceQuality:
          normalizeScrapeSourceQuality(String(diagnostics.sourceQuality ?? '')) ??
          normalizeScrapeSourceQuality(run.sourceQuality),
        classifiedOutcome,
        transportSummary,
        browserSummary,
        queryPlan:
          diagnostics.queryPlan && typeof diagnostics.queryPlan === 'object'
            ? {
                targetMin: Number((diagnostics.queryPlan as Record<string, unknown>).targetMin ?? 0),
                targetMax: Number((diagnostics.queryPlan as Record<string, unknown>).targetMax ?? 0),
                selectedStage:
                  normalizeString(String((diagnostics.queryPlan as Record<string, unknown>).selectedStage ?? '')) ?? '',
                selectedCount: Number((diagnostics.queryPlan as Record<string, unknown>).selectedCount ?? 0),
                attempts: Array.isArray((diagnostics.queryPlan as Record<string, unknown>).attempts)
                  ? ((diagnostics.queryPlan as Record<string, unknown>).attempts as Array<Record<string, unknown>>).map(
                      (item) => ({
                        stage: normalizeString(String(item.stage ?? '')) ?? 'unknown',
                        listingUrl: normalizeString(String(item.listingUrl ?? '')) ?? '',
                        listingCount: Number(item.listingCount ?? 0),
                        blockedCount: Number(item.blockedCount ?? 0),
                        recommendedCount: Number(item.recommendedCount ?? 0),
                        summaryCount: Number(item.summaryCount ?? 0),
                      }),
                    )
                  : [],
                targetWindowMissed: Boolean(
                  (diagnostics.queryPlan as Record<string, unknown>).targetWindowMissed ?? false,
                ),
                scarcityReason:
                  normalizeString(String((diagnostics.queryPlan as Record<string, unknown>).scarcityReason ?? '')) ??
                  null,
              }
            : null,
        scarcity:
          diagnostics.scarcity && typeof diagnostics.scarcity === 'object'
            ? {
                listingCountTooLow: Boolean(
                  (diagnostics.scarcity as Record<string, unknown>).listingCountTooLow ?? false,
                ),
                listingCountTooHigh: Boolean(
                  (diagnostics.scarcity as Record<string, unknown>).listingCountTooHigh ?? false,
                ),
                targetWindowMissed: Boolean(
                  (diagnostics.scarcity as Record<string, unknown>).targetWindowMissed ?? false,
                ),
                matchingRejectedMostCandidates: Boolean(
                  (diagnostics.scarcity as Record<string, unknown>).matchingRejectedMostCandidates ?? false,
                ),
              }
            : null,
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

  async listRunEvents(userId: string, runId: string) {
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
      })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const items = await this.db
      .select()
      .from(jobSourceRunEventsTable)
      .where(eq(jobSourceRunEventsTable.sourceRunId, runId))
      .orderBy(desc(jobSourceRunEventsTable.createdAt));

    return {
      items,
      total: items.length,
    };
  }

  async getRunForensics(userId: string, runId: string) {
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        status: jobSourceRunsTable.status,
        failureType: jobSourceRunsTable.failureType,
        error: jobSourceRunsTable.error,
        createdAt: jobSourceRunsTable.createdAt,
      })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const [executionEvents, callbackEvents] = await Promise.all([
      this.db
        .select()
        .from(scrapeExecutionEventsTable)
        .where(eq(scrapeExecutionEventsTable.sourceRunId, runId))
        .orderBy(desc(scrapeExecutionEventsTable.createdAt)),
      this.db
        .select({
          id: jobSourceCallbackEventsTable.id,
          eventId: jobSourceCallbackEventsTable.eventId,
          status: jobSourceCallbackEventsTable.status,
          requestId: jobSourceCallbackEventsTable.requestId,
          attemptNo: jobSourceCallbackEventsTable.attemptNo,
          receivedAt: jobSourceCallbackEventsTable.receivedAt,
          payload: jobSourceCallbackEventsTable.payload,
        })
        .from(jobSourceCallbackEventsTable)
        .where(eq(jobSourceCallbackEventsTable.sourceRunId, runId))
        .orderBy(desc(jobSourceCallbackEventsTable.receivedAt)),
    ]);

    return {
      run: {
        ...run,
        traceId: String(run.traceId),
        createdAt: run.createdAt.toISOString(),
      },
      executionEvents: executionEvents.map((event) => ({
        ...event,
        traceId: event.traceId ? String(event.traceId) : null,
        meta: this.toNullableRecord(event.meta),
        createdAt: event.createdAt.toISOString(),
      })),
      callbackEvents: callbackEvents.map((event) => ({
        ...event,
        receivedAt: event.receivedAt.toISOString(),
        payloadSummary: this.safeParseJson(event.payload),
      })),
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
      enqueueSuppressed: this.enqueueSuppressedCount,
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
      .returning({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        createdAt: jobSourceRunsTable.createdAt,
      });
    if (!reuseRun?.id) {
      return null;
    }

    await this.appendRunEvent({
      sourceRunId: reuseRun.id,
      traceId: reuseRun.traceId,
      eventType: 'run_reused_from_cache',
      message: 'Scrape request was served from cached database offers.',
      meta: {
        reusedFromRunId: reusedRun.id,
        listingUrl: input.listingUrl,
      },
    });

    const profileContext = await this.getCareerProfileContext(input.userId, input.careerProfileId);
    const inserted = profileContext.profile
      ? await this.linkCatalogOffersToUser({
          userId: input.userId,
          careerProfileId: input.careerProfileId,
          sourceRunId: reuseRun.id,
          source: input.source,
          profile: profileContext.profile,
          specificOfferIds: offers.map((offer) => offer.id),
          origin: 'DB_REUSE',
        })
      : {
          insertedCount: 0,
          totalCandidateCount: offers.length,
          matchedCount: 0,
        };
    await this.updateImmediateCompletedRun({
      runId: reuseRun.id,
      totalFound: offers.length,
      matchedCount: inserted.matchedCount,
      insertedCount: inserted.insertedCount,
    });

    await this.appendRunEvent({
      sourceRunId: reuseRun.id,
      traceId: reuseRun.traceId,
      eventType: 'user_link_completed',
      message: 'Cached catalog offers were linked to the user notebook.',
      meta: {
        candidateOffers: offers.length,
        matchedOffers: inserted.matchedCount,
        insertedOffers: inserted.insertedCount,
        origin: 'DB_REUSE',
      },
    });

    return {
      sourceRunId: reuseRun.id,
      traceId: reuseRun.traceId,
      acceptedAt: (reuseRun.createdAt ?? now).toISOString(),
      inserted: inserted.insertedCount,
      totalOffers: offers.length,
      reusedFromRunId: reusedRun.id,
    };
  }

  private computeCatalogContentHash(job: CallbackJobPayload) {
    return computeSha256Hex({
      sourceId: normalizeString(job.sourceId),
      url: normalizeOfferUrl(job.url),
      title: normalizeString(job.title),
      company: normalizeString(job.company),
      location: normalizeString(job.location),
      salary: normalizeString(job.salary),
      employmentType: normalizeString(job.employmentType),
      description: normalizeString(job.description),
      requirements: sanitizeStringArray(job.requirements),
      details: job.details ?? null,
    });
  }

  private resolveCatalogFreshUntil() {
    const rematchHours =
      this.configService.get('CATALOG_REMATCH_HOURS', { infer: true }) ?? DEFAULT_CATALOG_REMATCH_HOURS;
    return new Date(Date.now() + rematchHours * 60 * 60 * 1000).toISOString();
  }

  private buildCatalogMatchMeta(
    deterministic: ReturnType<typeof scoreCandidateAgainstJob>,
    origin: 'SCRAPE' | 'DB_REUSE' | 'CATALOG_REMATCH',
  ) {
    return {
      engine: CATALOG_MATCH_ENGINE,
      origin,
      score: deterministic.score,
      blockedByHardConstraints: deterministic.blockedByHardConstraints,
      breakdown: deterministic.breakdown,
      hardConstraintViolations: deterministic.hardConstraintViolations,
      softPreferenceGaps: deterministic.softPreferenceGaps,
      matchedCompetencies: deterministic.matchedCompetencies,
    };
  }

  private async loadCatalogCandidateOffers(
    source: 'PRACUJ_PL',
    specificOfferIds?: string[],
    explicitLimit?: number,
  ): Promise<CatalogOfferRow[]> {
    const rematchHours =
      this.configService.get('CATALOG_REMATCH_HOURS', { infer: true }) ?? DEFAULT_CATALOG_REMATCH_HOURS;
    const cutoff = new Date(Date.now() - rematchHours * 60 * 60 * 1000);
    const limit =
      this.configService.get('CATALOG_REMATCH_BATCH_SIZE', { infer: true }) ?? DEFAULT_CATALOG_REMATCH_BATCH_SIZE;
    const conditions = [
      eq(jobOffersTable.source, source),
      eq(jobOffersTable.qualityState, 'ACCEPTED'),
      eq(jobOffersTable.isExpired, false),
      gte(jobOffersTable.lastSeenAt, cutoff),
    ];
    if (specificOfferIds?.length) {
      conditions.push(inArray(jobOffersTable.id, specificOfferIds));
    }
    try {
      return await this.db
        .select({
          id: jobOffersTable.id,
          title: jobOffersTable.title,
          company: jobOffersTable.company,
          location: jobOffersTable.location,
          salary: jobOffersTable.salary,
          employmentType: jobOffersTable.employmentType,
          description: jobOffersTable.description,
          requirements: jobOffersTable.requirements,
          details: jobOffersTable.details,
          lastSeenAt: jobOffersTable.lastSeenAt,
        })
        .from(jobOffersTable)
        .where(and(...conditions))
        .orderBy(desc(jobOffersTable.lastSeenAt), desc(jobOffersTable.fetchedAt))
        .limit(specificOfferIds?.length ? specificOfferIds.length : (explicitLimit ?? limit));
    } catch (error) {
      this.logger.warn(
        {
          source,
          error: error instanceof Error ? error.message : String(error),
        },
        'Catalog candidate offer query degraded to empty result',
      );
      return [];
    }
  }

  private async countCatalogMatchesForProfile(profile: CandidateProfile, source: 'PRACUJ_PL', limit: number) {
    const minScore =
      this.configService.get('CATALOG_REMATCH_MIN_SCORE', { infer: true }) ?? DEFAULT_CATALOG_REMATCH_MIN_SCORE;
    const candidates = await this.loadCatalogCandidateOffers(source);
    let matched = 0;
    for (const offer of candidates) {
      const deterministic = scoreCandidateAgainstJob(profile, {
        text: offer.description,
        title: offer.title,
        location: offer.location,
        employmentType: offer.employmentType,
        salaryText: offer.salary,
      });
      if (!deterministic.blockedByHardConstraints && deterministic.score >= minScore) {
        matched += 1;
      }
      if (matched >= limit) {
        break;
      }
    }
    return matched;
  }

  private async linkCatalogOffersToUser(input: {
    userId: string;
    careerProfileId: string;
    sourceRunId: string;
    source: 'PRACUJ_PL';
    profile: CandidateProfile;
    origin: 'SCRAPE' | 'DB_REUSE' | 'CATALOG_REMATCH';
    specificOfferIds?: string[];
    limit?: number;
  }) {
    const minScore =
      this.configService.get('CATALOG_REMATCH_MIN_SCORE', { infer: true }) ?? DEFAULT_CATALOG_REMATCH_MIN_SCORE;
    const now = new Date();
    const includeAllScrapeCandidates = input.origin === 'SCRAPE' || input.origin === 'DB_REUSE';
    const candidates = await this.loadCatalogCandidateOffers(input.source, input.specificOfferIds, input.limit);
    if (!candidates.length) {
      return { insertedCount: 0, totalCandidateCount: 0, matchedCount: 0 };
    }

    const existingLinks = await this.db
      .select({ jobOfferId: userJobOffersTable.jobOfferId })
      .from(userJobOffersTable)
      .where(
        and(
          eq(userJobOffersTable.userId, input.userId),
          eq(userJobOffersTable.careerProfileId, input.careerProfileId),
          inArray(
            userJobOffersTable.jobOfferId,
            candidates.map((offer) => offer.id),
          ),
        ),
      );
    const existingOfferIds = new Set(existingLinks.map((row) => row.jobOfferId));

    const matchingOffers = candidates
      .filter((offer) => !existingOfferIds.has(offer.id))
      .map((offer) => ({
        offer,
        deterministic: scoreCandidateAgainstJob(input.profile, {
          text: offer.description,
          title: offer.title,
          location: offer.location,
          employmentType: offer.employmentType,
          salaryText: offer.salary,
        }),
      }))
      .filter(({ deterministic }) =>
        includeAllScrapeCandidates ? true : !deterministic.blockedByHardConstraints && deterministic.score >= minScore,
      );

    if (!matchingOffers.length) {
      return {
        insertedCount: 0,
        totalCandidateCount: candidates.length,
        matchedCount: 0,
      };
    }

    const inserted = await this.db
      .insert(userJobOffersTable)
      .values(
        matchingOffers.map(({ offer, deterministic }) => ({
          userId: input.userId,
          careerProfileId: input.careerProfileId,
          jobOfferId: offer.id,
          sourceRunId: input.sourceRunId,
          origin: input.origin,
          matchVersion: CATALOG_MATCH_VERSION,
          statusHistory: [{ status: 'NEW', changedAt: now.toISOString() }],
          lastStatusAt: now,
          matchScore: deterministic.score,
          matchMeta: this.buildCatalogMatchMeta(deterministic, input.origin),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: userJobOffersTable.id, jobOfferId: userJobOffersTable.jobOfferId });

    if (inserted.length) {
      await this.db
        .update(jobOffersTable)
        .set({ lastMatchedAt: now })
        .where(
          inArray(
            jobOffersTable.id,
            inserted.map((row) => row.jobOfferId),
          ),
        );
    }

    return {
      insertedCount: inserted.length,
      totalCandidateCount: candidates.length,
      matchedCount: matchingOffers.length,
    };
  }

  async rematchCatalogForUser(userId: string, careerProfileId?: string | null, limit = 20) {
    const profileContext = await this.getCareerProfileContext(userId, careerProfileId);
    if (!profileContext.careerProfileId || !profileContext.profile) {
      throw new NotFoundException('Active career profile not found');
    }

    const source = mapSource(inferPracujSource(profileContext.profile));
    const requestedLimit = Math.max(1, limit);
    const matchedCount = await this.countCatalogMatchesForProfile(profileContext.profile, source, requestedLimit);
    if (matchedCount === 0) {
      return { ok: true, inserted: 0, totalOffers: 0, matchedOffers: 0, status: 'empty' as const };
    }

    const now = new Date();
    const [run] = await this.db
      .insert(jobSourceRunsTable)
      .values({
        source,
        userId,
        careerProfileId: profileContext.careerProfileId,
        listingUrl: 'catalog://rematch',
        filters: null,
        status: 'COMPLETED',
        startedAt: now,
        completedAt: now,
        totalFound: matchedCount,
        scrapedCount: 0,
      })
      .returning({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        createdAt: jobSourceRunsTable.createdAt,
      });

    if (!run?.id) {
      throw new ServiceUnavailableException('Failed to create catalog rematch run');
    }

    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'run_reused_from_catalog',
      message: 'Notebook refresh was served from the shared offer catalog.',
      meta: {
        requestedLimit,
        matchedCount,
      },
    });

    const linked = await this.linkCatalogOffersToUser({
      userId,
      careerProfileId: profileContext.careerProfileId,
      sourceRunId: run.id,
      source,
      profile: profileContext.profile,
      origin: 'CATALOG_REMATCH',
      limit: requestedLimit,
    });
    await this.updateImmediateCompletedRun({
      runId: run.id,
      totalFound: matchedCount,
      matchedCount: linked.matchedCount,
      insertedCount: linked.insertedCount,
    });

    await this.appendRunEvent({
      sourceRunId: run.id,
      traceId: run.traceId,
      eventType: 'user_link_completed',
      message: 'Catalog rematch offers were linked to the user notebook.',
      meta: {
        matchedOffers: linked.matchedCount,
        insertedOffers: linked.insertedCount,
        origin: 'CATALOG_REMATCH',
      },
    });

    return {
      ok: true,
      sourceRunId: run.id,
      traceId: run.traceId,
      acceptedAt: (run.createdAt ?? now).toISOString(),
      inserted: linked.insertedCount,
      totalOffers: linked.totalCandidateCount,
      matchedOffers: linked.matchedCount,
      status: 'reused' as const,
    };
  }

  private async tryServeFromCatalog(input: {
    userId: string;
    careerProfileId: string;
    profile: CandidateProfile | null;
    source: 'PRACUJ_PL';
    limit: number;
  }) {
    if (!input.profile) {
      return null;
    }
    const matchedCount = await this.countCatalogMatchesForProfile(input.profile, input.source, input.limit);
    if (matchedCount < input.limit) {
      return null;
    }
    return this.rematchCatalogForUser(input.userId, input.careerProfileId, input.limit);
  }

  private async getSourceAutomationBackoff(source: 'PRACUJ_PL') {
    const windowRuns =
      this.configService.get('SCRAPE_SOURCE_FAILURE_WINDOW_RUNS', { infer: true }) ??
      DEFAULT_SCRAPE_SOURCE_FAILURE_WINDOW_RUNS;
    const failureThreshold =
      this.configService.get('SCRAPE_SOURCE_FAILURE_THRESHOLD', { infer: true }) ??
      DEFAULT_SCRAPE_SOURCE_FAILURE_THRESHOLD;
    const backoffMinutes =
      this.configService.get('SCRAPE_SOURCE_AUTOMATION_BACKOFF_MINUTES', { infer: true }) ??
      DEFAULT_SCRAPE_SOURCE_AUTOMATION_BACKOFF_MINUTES;
    const recentRuns = await this.db
      .select({
        status: jobSourceRunsTable.status,
        failureType: jobSourceRunsTable.failureType,
        classifiedOutcome: jobSourceRunsTable.classifiedOutcome,
        finalizedAt: jobSourceRunsTable.finalizedAt,
        completedAt: jobSourceRunsTable.completedAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.source, source))
      .orderBy(desc(jobSourceRunsTable.createdAt))
      .limit(windowRuns);

    const failedRuns = recentRuns.filter(
      (run) => run.status === 'FAILED' && ['timeout', 'network', 'parse', 'callback'].includes(run.failureType ?? ''),
    );
    const dominantFailureReasons = Array.from(
      recentRuns.reduce<Map<string, number>>((acc, run) => {
        const reason =
          normalizeString(run.classifiedOutcome) ??
          normalizeString(run.failureType) ??
          (run.status === 'FAILED' ? 'failed:unknown' : null);
        if (!reason) {
          return acc;
        }
        acc.set(reason, (acc.get(reason) ?? 0) + 1);
        return acc;
      }, new Map()),
    )
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([reason]) => reason);
    const latestFailure = failedRuns[0] ?? null;
    const referenceTime = latestFailure?.finalizedAt ?? latestFailure?.completedAt ?? null;
    const pausedUntil = referenceTime ? new Date(referenceTime.getTime() + backoffMinutes * 60 * 1000) : null;

    return {
      active: failedRuns.length >= failureThreshold && Boolean(pausedUntil && pausedUntil > new Date()),
      failureCount: failedRuns.length,
      windowRuns: recentRuns.length,
      pausedUntil,
      dominantFailureReasons,
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
      this.enqueueSuppressedCount += 1;
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

  private buildPreflightBlockerDetail(code: string) {
    if (code === 'career-profile-not-ready') {
      return {
        code,
        title: 'Career profile is not ready',
        description: 'Generate or restore a READY career profile before starting a scrape run.',
        href: '/profile',
        ctaLabel: 'Open profile studio',
      };
    }
    if (code === 'listing-url-unresolved') {
      return {
        code,
        title: 'Listing URL could not be resolved',
        description:
          'Provide a valid listing URL or restore a ready profile so the system can derive accepted filters.',
        href: '/notebook',
        ctaLabel: 'Review scrape settings',
      };
    }
    if (code === 'active-run-limit') {
      return {
        code,
        title: 'Too many active scrape runs',
        description: 'Wait for current runs to finish or inspect recent failures before enqueueing another run.',
        href: '/ops',
        ctaLabel: 'Review active runs',
      };
    }
    if (code === 'daily-budget-exhausted') {
      return {
        code,
        title: 'Daily scrape budget exhausted',
        description: 'You have used the current 24-hour run budget. Retry later or rely on the next scheduled run.',
        href: '/notebook',
        ctaLabel: 'Review notebook',
      };
    }

    return {
      code,
      title: 'Scrape run is blocked',
      description: 'Resolve the blocking condition before enqueueing a scrape run.',
      href: '/notebook',
      ctaLabel: 'Review notebook',
    };
  }

  private buildPreflightWarningDetail(code: string) {
    if (code === 'daily-budget-nearly-exhausted') {
      return {
        code,
        title: 'Daily budget is nearly exhausted',
        description: 'Only a small number of runs remain in the current 24-hour window.',
      };
    }
    if (code === 'filters-relaxed-during-normalization') {
      return {
        code,
        title: 'Some filters were relaxed',
        description: 'The system dropped unsupported or overly strict filter values during normalization.',
      };
    }
    if (code === 'using-profile-derived-filters') {
      return {
        code,
        title: 'Using profile-derived filters',
        description:
          'This run will use filters resolved from the active career profile instead of a custom listing URL.',
      };
    }
    if (code === 'source-health-backoff') {
      return {
        code,
        title: 'Automation is temporarily paused for this source',
        description:
          'Recent scrape failures indicate unstable source behavior. Manual runs are still allowed, but scheduled scraping is backing off.',
      };
    }

    return {
      code,
      title: 'Review this warning',
      description: 'This warning does not block the run, but it may affect the outcome or cost.',
    };
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
      classifiedOutcome: string | null;
      emptyReason: string | null;
      sourceQuality: string | null;
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
      const rows = await (
        result as unknown as { returning: (selection: Record<string, unknown>) => Promise<Array<{ id: string }>> }
      ).returning({
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
      classifiedOutcome: this.resolveClassifiedOutcome({
        status: 'FAILED',
        failureType,
        diagnostics: null,
        scrapedCount: 0,
      }),
      emptyReason: null,
      sourceQuality: 'failed',
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
        classifiedOutcome: 'worker_timeout',
        emptyReason: null,
        sourceQuality: 'failed',
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
        classifiedOutcome: 'worker_timeout',
        emptyReason: null,
        sourceQuality: 'failed',
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
    attemptNo = 1,
    payloadHash?: string,
    emittedAt?: Date | null,
  ): Promise<CallbackEventRegisterResult> {
    const shouldCheckExistingEvent = attemptNo > 1 || Boolean(normalizeString(payloadHash));
    if (shouldCheckExistingEvent) {
      const existingEvent = await this.db
        .select({
          id: jobSourceCallbackEventsTable.id,
          payloadHash: jobSourceCallbackEventsTable.payloadHash,
        })
        .from(jobSourceCallbackEventsTable)
        .where(
          and(
            eq(jobSourceCallbackEventsTable.sourceRunId, sourceRunId),
            eq(jobSourceCallbackEventsTable.eventId, eventId),
          ),
        )
        .limit(1)
        .then(([result]) => result);
      if (existingEvent?.id) {
        const existingHash = normalizeString(existingEvent.payloadHash);
        const incomingHash = normalizeString(payloadHash);
        if (existingHash && incomingHash && existingHash !== incomingHash) {
          return {
            accepted: false,
            reasonCode: 'CONFLICTING_EVENT_PAYLOAD',
          } as const;
        }
        return {
          accepted: false,
          reasonCode: 'DUPLICATE_EVENT_ID',
        } as const;
      }
    }

    if (attemptNo > 1) {
      const latestAttempt = await this.db
        .select({ value: sql<number>`max(${jobSourceCallbackEventsTable.attemptNo})` })
        .from(jobSourceCallbackEventsTable)
        .where(eq(jobSourceCallbackEventsTable.sourceRunId, sourceRunId))
        .then(([result]) => Number(result?.value ?? 0));
      if (attemptNo < latestAttempt) {
        return {
          accepted: false,
          reasonCode: 'STALE_ATTEMPT',
        } as const;
      }
      if (latestAttempt > 0 && attemptNo > latestAttempt + 1) {
        return {
          accepted: false,
          reasonCode: 'ATTEMPT_ORDER_VIOLATION',
        } as const;
      }
    }

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
        attemptNo,
        payloadHash: payloadHash ?? null,
        emittedAt: emittedAt ?? null,
        requestId: requestId ?? null,
        status,
        payload,
      })
      .onConflictDoNothing()
      .returning({ id: jobSourceCallbackEventsTable.id });

    if (!inserted.length) {
      return {
        accepted: false,
        reasonCode: 'DUPLICATE_EVENT_ID',
      } as const;
    }

    return {
      accepted: true,
      payloadHash: payloadHash ?? '',
      attemptNo,
      emittedAt: emittedAt ?? null,
    } as const;
  }

  private async registerRunAttempt(
    sourceRunId: string,
    attemptNo: number,
    input: {
      status: 'COMPLETED' | 'FAILED';
      payloadHash: string;
      emittedAt: Date | null;
      completedAt: Date;
      failureType: RunFailureType | null;
      failureCode: string | null;
      error: string | null;
    },
  ) {
    try {
      await this.db
        .insert(jobSourceRunAttemptsTable)
        .values({
          sourceRunId,
          attemptNo,
          status: input.status,
          startedAt: input.emittedAt ?? input.completedAt,
          completedAt: input.completedAt,
          failureType: input.failureType,
          failureCode: input.failureCode,
          error: input.error,
          payloadHash: input.payloadHash,
        })
        .onConflictDoUpdate({
          target: [jobSourceRunAttemptsTable.sourceRunId, jobSourceRunAttemptsTable.attemptNo],
          set: {
            status: input.status,
            completedAt: input.completedAt,
            failureType: input.failureType,
            failureCode: input.failureCode,
            error: input.error,
            payloadHash: input.payloadHash,
          },
        });
    } catch (error) {
      this.logger.warn(
        {
          sourceRunId,
          attemptNo,
          status: input.status,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to persist scrape run attempt metadata',
      );
    }
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

    // Track high matches for alerting
    const highMatchOfferIds: string[] = [];

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
            const result = await this.jobOffersService.scoreOffer(userId, nextId, minScore);
            scored += 1;
            success = true;
            if (result.score >= 85) {
              highMatchOfferIds.push(nextId);
            }
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

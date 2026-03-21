import { createHash, createHmac, randomUUID } from 'crypto';

import { classifyScrapeOutcome } from '@repo/db';

import { persistDeadLetter } from './callback-dead-letter';
import { resolveOutboundAuthorizationHeader } from './oidc-auth';
import { relaxPracujFiltersOnce } from './pracuj-filter-relaxation';
import { resolvePipeline, runPipeline } from './scrape-pipelines';
import { appendScrapeExecutionEvent } from '../db/scrape-execution-events';
import { saveOutput } from '../output/save-output';
import { loadFreshOfferUrls } from '../db/fresh-offers';

import type {
  ScrapeClassifiedOutcome,
  PracujSourceKind,
  ScrapeEmptyReason,
  ScrapeFilters,
  ScrapeResultKind,
  ScrapeSourceQuality,
} from '@repo/db';
import type { Logger } from 'pino';
import type { ScrapeSourceJob } from '../types/jobs';
import type { DetailFetchDiagnostics, ListingJobSummary, NormalizedJob, ParsedJob, RawPage } from '../sources/types';

type CallbackPayload = {
  eventId?: string;
  source: string;
  runId: string;
  sourceRunId?: string;
  traceId?: string;
  attemptNo?: number;
  emittedAt?: string;
  payloadHash?: string;
  listingUrl: string;
  status: 'COMPLETED' | 'FAILED';
  scrapedCount?: number;
  totalFound?: number;
  jobCount?: number;
  jobLinkCount?: number;
  jobs?: NormalizedJob[];
  outputPath?: string;
  error?: string;
  failureType?: ScrapeFailureType;
  failureCode?: string;
  diagnostics?: {
    relaxationTrail?: string[];
    blockedUrls?: string[];
    pagesVisited?: number;
    jobLinksDiscovered?: number;
    ignoredRecommendedLinks?: number;
    dedupedInRunCount?: number;
    skippedFreshUrls?: number;
    blockedPages?: number;
    hadZeroOffersStep?: boolean;
    attemptCount?: number;
    adaptiveDelayApplied?: number;
    blockedRate?: number;
    finalPolicy?: string;
    resultKind?: ScrapeResultKind;
    emptyReason?: ScrapeEmptyReason | null;
    sourceQuality?: ScrapeSourceQuality;
    classifiedOutcome?: ScrapeClassifiedOutcome;
  };
};

export type ScrapeFailureType = 'validation' | 'network' | 'parse' | 'callback' | 'timeout' | 'unknown';
type CompletionDiagnosticsInput = {
  sanitizedCount: number;
  jobLinkCount: number;
  blockedUrlCount: number;
  hadZeroOffersStep: boolean;
  rejectedOfferCount: number;
};

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const toError = (error: unknown) => (error instanceof Error ? error : new Error('Unknown error'));
const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const sanitizeStringArray = (value: string[] | undefined) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

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
export const computeCallbackPayloadHash = (payload: Record<string, unknown>) =>
  createHash('sha256').update(stableJson(payload)).digest('hex');
export const computeNormalizedJobContentHash = (
  job: Pick<
    NormalizedJob,
    | 'sourceId'
    | 'url'
    | 'title'
    | 'company'
    | 'location'
    | 'description'
    | 'salary'
    | 'employmentType'
    | 'requirements'
    | 'details'
  >,
) =>
  createHash('sha256')
    .update(
      stableJson({
        sourceId: normalizeString(job.sourceId),
        url: normalizeString(job.url),
        title: normalizeString(job.title),
        company: normalizeString(job.company),
        location: normalizeString(job.location),
        description: normalizeString(job.description),
        salary: normalizeString(job.salary),
        employmentType: normalizeString(job.employmentType),
        requirements: sanitizeStringArray(job.requirements),
        details: job.details ?? null,
      }),
    )
    .digest('hex');

export const resolveScrapeCompletionDiagnostics = ({
  sanitizedCount,
  jobLinkCount,
  blockedUrlCount,
  hadZeroOffersStep,
  rejectedOfferCount,
}: CompletionDiagnosticsInput): {
  blockedRate: number;
  resultKind: ScrapeResultKind;
  emptyReason: ScrapeEmptyReason | null;
  sourceQuality: ScrapeSourceQuality;
} => {
  const blockedRate = jobLinkCount > 0 ? Number((blockedUrlCount / jobLinkCount).toFixed(4)) : 0;

  if (sanitizedCount > 0) {
    if (blockedRate >= 0.3) {
      return {
        blockedRate,
        resultKind: 'blocked',
        emptyReason: null,
        sourceQuality: 'degraded',
      };
    }

    return {
      blockedRate,
      resultKind: 'healthy',
      emptyReason: null,
      sourceQuality: blockedUrlCount > 0 || rejectedOfferCount > 0 ? 'degraded' : 'healthy',
    };
  }

  if (hadZeroOffersStep) {
    return {
      blockedRate,
      resultKind: 'empty',
      emptyReason: 'filters_exhausted',
      sourceQuality: 'empty',
    };
  }

  if (jobLinkCount === 0) {
    return {
      blockedRate,
      resultKind: 'empty',
      emptyReason: 'no_listings',
      sourceQuality: 'empty',
    };
  }

  if (blockedUrlCount === jobLinkCount || blockedRate >= 0.5) {
    return {
      blockedRate,
      resultKind: 'blocked',
      emptyReason: null,
      sourceQuality: 'degraded',
    };
  }

  return {
    blockedRate,
    resultKind: 'empty',
    emptyReason: 'detail_parse_gap',
    sourceQuality: 'degraded',
  };
};

const canonicalOfferKey = (job: Pick<NormalizedJob, 'sourceId' | 'url'>) => {
  const sourceId = normalizeString(job.sourceId);
  if (sourceId) {
    return `source:${sourceId.toLowerCase()}`;
  }
  const url = normalizeString(job.url);
  if (!url) {
    return null;
  }
  try {
    const normalized = new URL(url);
    normalized.search = '';
    normalized.hash = '';
    return `url:${normalized.toString().toLowerCase()}`;
  } catch {
    return `url:${url.toLowerCase()}`;
  }
};

const isPracujSource = (source: string): source is PracujSourceKind =>
  source === 'pracuj-pl' || source === 'pracuj-pl-it' || source === 'pracuj-pl-general';

export const sanitizeCallbackJobs = (jobs: NormalizedJob[] | undefined) => {
  if (!jobs?.length) {
    return [];
  }

  const dedupByCanonical = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const url = normalizeString(job.url);
    const title = normalizeString(job.title);
    const description = normalizeString(job.description);
    if (!url || !title || !description) {
      continue;
    }

    const dedupeKey =
      canonicalOfferKey({
        sourceId: job.sourceId,
        url,
      }) ?? url.toLowerCase();
    if (dedupByCanonical.has(dedupeKey)) {
      continue;
    }

    dedupByCanonical.set(dedupeKey, {
      ...job,
      source: normalizeString(job.source) ?? 'unknown',
      sourceId: normalizeString(job.sourceId),
      title,
      company: normalizeString(job.company),
      location: normalizeString(job.location),
      description,
      url,
      tags: sanitizeStringArray(job.tags),
      salary: normalizeString(job.salary),
      employmentType: normalizeString(job.employmentType),
      requirements: sanitizeStringArray(job.requirements),
      isExpired: job.isExpired,
    });
  }

  return Array.from(dedupByCanonical.values());
};

export const assessNormalizedJobs = (jobs: NormalizedJob[] | undefined) => {
  const sanitized = sanitizeCallbackJobs(jobs);
  const acceptedJobs: NormalizedJob[] = [];
  const rejectedOfferReasons: Record<string, number> = {};

  const reject = (reason: string) => {
    rejectedOfferReasons[reason] = (rejectedOfferReasons[reason] ?? 0) + 1;
  };

  for (const job of sanitized) {
    const normalizedTitle = normalizeString(job.title)?.toLowerCase();
    const normalizedDescription = normalizeString(job.description)?.toLowerCase();
    if (!normalizedTitle) {
      reject('missing_title');
      continue;
    }
    if (!normalizedDescription) {
      reject('missing_description');
      continue;
    }
    if (normalizedTitle === 'unknown title') {
      reject('placeholder_title');
      continue;
    }
    if (normalizedDescription === 'no description found' || normalizedDescription === 'listing summary only') {
      reject('placeholder_description');
      continue;
    }
    if (job.isExpired) {
      reject('expired_offer');
      continue;
    }
    acceptedJobs.push(job);
  }

  return {
    acceptedJobs,
    acceptedOfferCount: acceptedJobs.length,
    rejectedOfferCount: Object.values(rejectedOfferReasons).reduce((acc, value) => acc + value, 0),
    rejectedOfferReasons,
  };
};

export const classifyScrapeError = (error: unknown): ScrapeFailureType => {
  const normalized = toError(error);
  const message = normalized.message.toLowerCase();

  if (normalized.name === 'ScrapeTimeoutError' || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('callback')) {
    return 'callback';
  }
  if (message.includes('parse') || message.includes('invalid json') || message.includes('schema')) {
    return 'parse';
  }
  if (message.includes('required') || message.includes('invalid') || message.includes('unsupported')) {
    return 'validation';
  }
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('ecconn') ||
    message.includes('cloudflare') ||
    message.includes('navigation')
  ) {
    return 'network';
  }

  return 'unknown';
};

export const buildWorkerCallbackSignaturePayload = (
  payload: CallbackPayload,
  requestId: string | undefined,
  timestampSec: number,
) =>
  `${timestampSec}.${payload.sourceRunId ?? ''}.${payload.status}.${payload.runId}.${requestId ?? ''}.${payload.eventId ?? ''}`;

const notifyHeartbeat = async (
  url: string,
  token: string | undefined,
  oidcAudience: string | undefined,
  signingSecret: string | undefined,
  requestId: string | undefined,
  payload: {
    sourceRunId?: string;
    runId?: string;
    traceId?: string;
    phase: 'listing_fetch' | 'detail_fetch' | 'normalize' | 'callback';
    attempt: number;
    pagesVisited: number;
    jobLinksDiscovered: number;
    normalizedOffers: number;
    meta?: Record<string, unknown>;
  },
  logger: Logger,
) => {
  if (!payload.sourceRunId) {
    return;
  }
  const timestampSec = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestampSec}.${payload.sourceRunId}.HEARTBEAT.${payload.runId ?? ''}.${requestId ?? ''}.heartbeat`;
  const signature = signingSecret ? createHmac('sha256', signingSecret).update(signaturePayload).digest('hex') : null;

  try {
    const authorization = await resolveOutboundAuthorizationHeader(token, oidcAudience);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestId ? { 'x-request-id': requestId } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
        ...(signature ? { 'x-worker-signature': signature, 'x-worker-timestamp': String(timestampSec) } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      logger.warn(
        {
          requestId,
          sourceRunId: payload.sourceRunId,
          traceId: payload.traceId,
          status: response.status,
          body: text,
          phase: payload.phase,
        },
        'Heartbeat rejected',
      );
    }
  } catch (error) {
    logger.warn(
      {
        requestId,
        sourceRunId: payload.sourceRunId,
        traceId: payload.traceId,
        phase: payload.phase,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to send scrape heartbeat',
    );
  }
};

export const computeCallbackRetryDelayMs = (
  attempt: number,
  baseBackoffMs: number,
  maxDelayMs: number,
  jitterPct: number,
  randomValue = Math.random(),
) => {
  const safeAttempt = Math.max(1, attempt);
  const safeBase = Math.max(1, baseBackoffMs);
  const exponential = Math.min(maxDelayMs, safeBase * 2 ** (safeAttempt - 1));
  const boundedJitter = Math.max(0, Math.min(1, jitterPct));
  if (boundedJitter === 0) {
    return exponential;
  }
  const spread = exponential * boundedJitter;
  const boundedRandom = Math.max(0, Math.min(1, randomValue));
  const offset = (boundedRandom * 2 - 1) * spread;
  return Math.max(0, Math.round(exponential + offset));
};

const notifyCallback = async (
  url: string,
  token: string | undefined,
  oidcAudience: string | undefined,
  signingSecret: string | undefined,
  requestId: string | undefined,
  payload: CallbackPayload,
  options: {
    retryAttempts: number;
    retryBackoffMs: number;
    retryMaxDelayMs: number;
    retryJitterPct: number;
    deadLetterDir?: string;
    onRejected?: (input: { attempt: number; statusCode?: number; error: string }) => Promise<void>;
    onRetryScheduled?: (input: {
      attempt: number;
      nextAttempt: number;
      delayMs: number;
      error: string;
    }) => Promise<void>;
    onAccepted?: (input: { attempt: number; statusCode: number; durationMs: number }) => Promise<void>;
    onDeadLettered?: (input: { attempts: number; error: string }) => Promise<void>;
  },
  logger: Logger,
) => {
  let lastError: unknown;
  const callbackStartedAt = Date.now();
  for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
    try {
      const authorization = await resolveOutboundAuthorizationHeader(token, oidcAudience);
      const timestampSec = Math.floor(Date.now() / 1000);
      const signaturePayload = buildWorkerCallbackSignaturePayload(payload, requestId, timestampSec);
      const signature = signingSecret
        ? createHmac('sha256', signingSecret).update(signaturePayload).digest('hex')
        : null;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { 'x-request-id': requestId } : {}),
          ...(authorization ? { Authorization: authorization } : {}),
          ...(signature ? { 'x-worker-signature': signature, 'x-worker-timestamp': String(timestampSec) } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Callback rejected (${response.status}): ${text}`);
        await options.onRejected?.({
          attempt,
          statusCode: response.status,
          error: text || `HTTP ${response.status}`,
        });
        logger.warn(
          {
            requestId,
            sourceRunId: payload.sourceRunId,
            traceId: payload.traceId,
            status: response.status,
            body: text,
            attempt,
          },
          'Callback rejected',
        );
      } else {
        await options.onAccepted?.({
          attempt,
          statusCode: response.status,
          durationMs: Date.now() - callbackStartedAt,
        });
        logger.info(
          {
            requestId,
            sourceRunId: payload.sourceRunId,
            traceId: payload.traceId,
            status: response.status,
            attempt,
          },
          'Callback acknowledged',
        );
        return;
      }
    } catch (error) {
      lastError = error;
      await options.onRejected?.({
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      logger.warn(
        {
          requestId,
          sourceRunId: payload.sourceRunId,
          traceId: payload.traceId,
          error,
          attempt,
        },
        'Failed to notify callback',
      );
    }
    if (attempt < options.retryAttempts) {
      const delayMs = computeCallbackRetryDelayMs(
        attempt,
        options.retryBackoffMs,
        options.retryMaxDelayMs,
        options.retryJitterPct,
      );
      await options.onRetryScheduled?.({
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        error: lastError instanceof Error ? lastError.message : 'Unknown callback failure',
      });
      await sleep(delayMs);
    }
  }

  await persistDeadLetter(
    {
      callbackUrl: url,
      callbackToken: token,
      requestId,
      payload: buildScrapeCallbackPayload(payload),
      reason: lastError instanceof Error ? lastError.message : 'Unknown callback failure',
      createdAt: new Date().toISOString(),
    },
    options.deadLetterDir,
    logger,
  );
  await options.onDeadLettered?.({
    attempts: options.retryAttempts,
    error: lastError instanceof Error ? lastError.message : 'Unknown callback failure',
  });
  logger.error(
    {
      requestId,
      sourceRunId: payload.sourceRunId,
      traceId: payload.traceId,
      error: lastError,
    },
    'Callback failed after retries',
  );
};

export const buildScrapeCallbackPayload = (input: CallbackPayload) => ({
  eventId: input.eventId,
  source: input.source,
  runId: input.runId,
  sourceRunId: input.sourceRunId,
  traceId: input.traceId,
  attemptNo: input.attemptNo,
  emittedAt: input.emittedAt,
  payloadHash: input.payloadHash,
  listingUrl: input.listingUrl,
  status: input.status,
  scrapedCount: input.scrapedCount,
  totalFound: input.totalFound,
  jobCount: input.jobCount,
  jobLinkCount: input.jobLinkCount,
  jobs: input.jobs,
  outputPath: input.outputPath,
  error: input.error,
  failureType: input.failureType,
  failureCode: input.failureCode,
  diagnostics: input.diagnostics,
});

export const runScrapeJob = async (
  payload: ScrapeSourceJob,
  logger: Logger,
  options: {
    headless: boolean;
    outputDir?: string;
    listingDelayMs?: number;
    listingCooldownMs?: number;
    detailDelayMs?: number;
    detailCacheHours?: number;
    listingOnly?: boolean;
    detailHost?: string;
    detailCookiesPath?: string;
    detailHumanize?: boolean;
    requireDetail?: boolean;
    profileDir?: string;
    outputMode?: 'full' | 'minimal';
    callbackUrl?: string;
    callbackToken?: string;
    callbackSigningSecret?: string;
    callbackRetryAttempts?: number;
    callbackRetryBackoffMs?: number;
    callbackRetryMaxDelayMs?: number;
    callbackRetryJitterPct?: number;
    heartbeatIntervalMs?: number;
    callbackDeadLetterDir?: string;
    callbackOidcAudience?: string;
    scrapeTimeoutMs?: number;
    databaseUrl?: string;
  },
) => {
  const startedAt = Date.now();
  const runId = payload.runId ?? `run-${Date.now()}`;
  const callbackEventId = randomUUID();
  const sourceRunId = payload.sourceRunId;
  const traceId = payload.traceId;
  const pipeline = resolvePipeline(payload.source);
  const listingUrl = payload.listingUrl ?? (payload.filters ? pipeline.buildListingUrl(payload.filters) : undefined);
  if (!listingUrl) {
    throw new Error('listingUrl or filters are required');
  }

  try {
    const callbackUrl = payload.callbackUrl ?? options.callbackUrl;
    const heartbeatUrl =
      payload.heartbeatUrl ??
      (callbackUrl
        ? callbackUrl.replace(/\/job-sources\/complete\/?$/i, `/job-sources/runs/${sourceRunId}/heartbeat`)
        : undefined);
    const callbackToken = payload.callbackToken ?? options.callbackToken;
    const callbackOidcAudience = options.callbackOidcAudience;
    const callbackSigningSecret = options.callbackSigningSecret;
    const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10000;
    let lastHeartbeatAt = 0;
    let attemptsExecuted = 0;
    let adaptiveDetailDelayMs = options.detailDelayMs;
    let adaptiveDelayApplied = 0;
    const emitExecutionEvent = async (
      stage: string,
      status: 'info' | 'success' | 'warning' | 'failed',
      message: string,
      code?: string,
      meta?: Record<string, unknown>,
    ) => {
      await appendScrapeExecutionEvent(options.databaseUrl, {
        sourceRunId,
        traceId,
        requestId: payload.requestId,
        stage,
        status,
        code,
        message,
        meta,
      }).catch((error) => {
        logger.warn(
          {
            sourceRunId,
            traceId,
            stage,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to persist scrape execution audit event',
        );
      });
    };

    await emitExecutionEvent('scrape_start', 'info', 'Scrape job started', 'SCRAPE_STARTED', {
      source: payload.source,
      listingUrl,
      requestedLimit: payload.limit ?? null,
      databaseAuditEnabled: Boolean(options.databaseUrl),
    });

    const emitHeartbeat = async (
      phase: 'listing_fetch' | 'detail_fetch' | 'normalize' | 'callback',
      attempt: number,
      pagesVisited: number,
      jobLinksDiscovered: number,
      normalizedOffers: number,
      force = false,
      meta?: Record<string, unknown>,
    ) => {
      if (!heartbeatUrl || !sourceRunId) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastHeartbeatAt < heartbeatIntervalMs) {
        return;
      }
      lastHeartbeatAt = now;
      await notifyHeartbeat(
        heartbeatUrl,
        callbackToken,
        callbackOidcAudience,
        callbackSigningSecret,
        payload.requestId,
        {
          sourceRunId,
          runId,
          traceId,
          phase,
          attempt,
          pagesVisited,
          jobLinksDiscovered,
          normalizedOffers,
          meta,
        },
        logger,
      );
    };

    const timeoutMs = options.scrapeTimeoutMs ?? 180000;
    let timeoutRef: NodeJS.Timeout | null = null;
    const timeoutPromiseTemplate = new Promise<never>((_, reject) => {
      const timeoutError = new Error(`Scrape timed out after ${timeoutMs}ms`);
      timeoutError.name = 'ScrapeTimeoutError';
      timeoutRef = setTimeout(() => reject(timeoutError), timeoutMs);
      timeoutRef?.unref?.();
    });

    const requestedLimit = Math.max(1, payload.limit ?? 10);
    const maxRelaxationAttempts = Math.max(1, requestedLimit + 4);
    const collectedKeys = new Set<string>();
    const skipUrls = new Set<string>();
    const aggregatedPages: RawPage[] = [];
    const aggregatedBlockedUrls: string[] = [];
    const aggregatedJobLinks = new Set<string>();
    const aggregatedRecommendedLinks = new Set<string>();
    const aggregatedParsedJobs: ParsedJob[] = [];
    const aggregatedNormalized: NormalizedJob[] = [];
    const aggregatedNormalizedKeys = new Set<string>();
    const aggregatedDiagnostics: DetailFetchDiagnostics[] = [];
    let listingHtml = '';
    let listingData: unknown = null;
    let listingSummaries: ListingJobSummary[] = [];
    let attemptListingUrl = listingUrl;
    let activeFilters: ScrapeFilters | null = payload.filters ? { ...payload.filters } : null;
    let relaxReason: string | null = null;
    const relaxationTrail: string[] = [];
    let hadZeroOffersStep = false;

    for (let attempt = 1; attempt <= maxRelaxationAttempts; attempt += 1) {
      attemptsExecuted = attempt;
      if (attempt > 1 && relaxReason) {
        await emitExecutionEvent(
          'filter_relaxation',
          'warning',
          'Retrying scrape with relaxed filters',
          'FILTER_RELAXED',
          {
            attempt,
            relaxReason,
            activeFilters,
          },
        );
        logger.info(
          {
            requestId: payload.requestId,
            sourceRunId,
            traceId,
            attempt,
            relaxReason,
            activeFilters,
          },
          'Retrying scrape with relaxed filters',
        );
      }
      await emitHeartbeat(
        'listing_fetch',
        attempt,
        aggregatedPages.length,
        aggregatedJobLinks.size,
        aggregatedNormalized.length,
      );
      const remaining = Math.max(1, requestedLimit - collectedKeys.size);
      await emitExecutionEvent('listing_fetch', 'info', 'Listing fetch attempt started', 'LISTING_FETCH_STARTED', {
        attempt,
        listingUrl: attemptListingUrl,
        remaining,
      });

      const listingFetchStartedAt = Date.now();
      const pipelinePromise = runPipeline(payload.source, {
        headless: options.headless,
        listingUrl: attemptListingUrl,
        limit: remaining,
        logger,
        options: {
          listingDelayMs: options.listingDelayMs,
          listingCooldownMs: options.listingCooldownMs,
          detailDelayMs: adaptiveDetailDelayMs,
          listingOnly: options.listingOnly,
          detailHost: options.detailHost,
          detailCookiesPath: options.detailCookiesPath,
          detailHumanize: options.detailHumanize,
          profileDir: options.profileDir,
          skipUrls,
          skipResolver: (urls: string[]) =>
            loadFreshOfferUrls(options.databaseUrl, 'PRACUJ_PL', urls, options.detailCacheHours ?? 24),
          onProgress: async ({ stage, meta }) => {
            const eventCodeByStage: Record<string, string> = {
              listing_browser_launch_started: 'LISTING_BROWSER_LAUNCH_STARTED',
              listing_browser_launch_completed: 'LISTING_BROWSER_LAUNCH_COMPLETED',
              listing_navigation_started: 'LISTING_NAVIGATION_STARTED',
              listing_navigation_completed: 'LISTING_NAVIGATION_COMPLETED',
              listing_navigation_retry: 'LISTING_NAVIGATION_RETRY',
              listing_ready_timeout: 'LISTING_READY_TIMEOUT',
              detail_navigation_started: 'DETAIL_NAVIGATION_STARTED',
              detail_navigation_completed: 'DETAIL_NAVIGATION_COMPLETED',
              detail_navigation_failed: 'DETAIL_NAVIGATION_FAILED',
            };
            const statusByStage: Record<string, 'info' | 'success' | 'warning' | 'failed'> = {
              listing_browser_launch_started: 'info',
              listing_browser_launch_completed: 'success',
              listing_navigation_started: 'info',
              listing_navigation_completed: 'success',
              listing_navigation_retry: 'warning',
              listing_ready_timeout: 'warning',
              detail_navigation_started: 'info',
              detail_navigation_completed: 'success',
              detail_navigation_failed: 'warning',
            };
            await emitExecutionEvent(
              'listing_progress',
              statusByStage[stage] ?? 'info',
              stage,
              eventCodeByStage[stage],
              {
                attempt,
                ...(meta ?? {}),
              },
            );
          },
        },
      });

      let crawlResult: Awaited<typeof pipelinePromise>['crawlResult'];
      let parsedJobs: Awaited<typeof pipelinePromise>['parsedJobs'];
      let normalized: Awaited<typeof pipelinePromise>['normalized'];
      try {
        ({ crawlResult, parsedJobs, normalized } = await Promise.race([pipelinePromise, timeoutPromiseTemplate]));
      } catch (error) {
        await emitExecutionEvent('listing_fetch', 'failed', 'Listing fetch attempt failed', 'LISTING_FETCH_FAILED', {
          attempt,
          listingUrl: attemptListingUrl,
          durationMs: Date.now() - listingFetchStartedAt,
          error: error instanceof Error ? error.message : 'Unknown listing fetch failure',
        });
        throw error;
      }
      await emitExecutionEvent('listing_fetch', 'success', 'Listing and detail fetch completed', 'LISTING_FETCH_OK', {
        attempt,
        pagesVisited: crawlResult.pages.length,
        jobLinksDiscovered: crawlResult.jobLinks.length,
        blockedPages: crawlResult.blockedUrls.length,
        durationMs: Date.now() - listingFetchStartedAt,
      });
      await emitHeartbeat(
        'detail_fetch',
        attempt,
        aggregatedPages.length + crawlResult.pages.length,
        aggregatedJobLinks.size + crawlResult.jobLinks.length,
        aggregatedNormalized.length + normalized.length,
      );
      listingHtml = crawlResult.listingHtml;
      listingData = crawlResult.listingData;
      listingSummaries = crawlResult.listingSummaries;
      crawlResult.jobLinks.forEach((url) => aggregatedJobLinks.add(url));
      crawlResult.recommendedJobLinks.forEach((url) => aggregatedRecommendedLinks.add(url));
      crawlResult.blockedUrls.forEach((url) => aggregatedBlockedUrls.push(url));
      crawlResult.detailDiagnostics.forEach((item) => aggregatedDiagnostics.push(item));
      crawlResult.pages.forEach((page) => aggregatedPages.push(page));

      for (const parsed of parsedJobs) {
        const key = canonicalOfferKey({ sourceId: parsed.sourceId ?? null, url: parsed.url });
        if (!key || collectedKeys.has(key)) {
          continue;
        }
        collectedKeys.add(key);
        skipUrls.add(parsed.url);
        aggregatedParsedJobs.push(parsed);
      }

      for (const item of normalized) {
        const key = canonicalOfferKey(item);
        if (!key || aggregatedNormalizedKeys.has(key)) {
          continue;
        }
        aggregatedNormalizedKeys.add(key);
        aggregatedNormalized.push(item);
      }

      const blockedRate =
        crawlResult.jobLinks.length > 0
          ? Number((crawlResult.blockedUrls.length / crawlResult.jobLinks.length).toFixed(4))
          : 0;
      if (!options.listingOnly && blockedRate >= 0.2) {
        const nextDelay = Math.min(10000, Math.max(500, (adaptiveDetailDelayMs ?? 0) + 500));
        adaptiveDelayApplied += Math.max(0, nextDelay - (adaptiveDetailDelayMs ?? 0));
        adaptiveDetailDelayMs = nextDelay;
      }

      if (collectedKeys.size >= requestedLimit) {
        break;
      }

      const shouldRelax = isPracujSource(payload.source) && activeFilters && !options.listingOnly;
      if (!shouldRelax) {
        break;
      }

      const zeroOrNoPrimary = crawlResult.hasZeroOffers || crawlResult.jobLinks.length === 0;
      hadZeroOffersStep = hadZeroOffersStep || zeroOrNoPrimary;
      if (!zeroOrNoPrimary) {
        break;
      }

      const relaxed = relaxPracujFiltersOnce(payload.source, activeFilters);
      if (!relaxed.next) {
        break;
      }

      activeFilters = relaxed.next;
      relaxReason = relaxed.reason;
      relaxationTrail.push(relaxed.reason);
      attemptListingUrl = pipeline.buildListingUrl(activeFilters);
    }

    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    const assessedJobs = assessNormalizedJobs(aggregatedNormalized);
    const sanitizedJobs = assessedJobs.acceptedJobs;
    const dedupedInRunCount = Math.max(
      0,
      aggregatedNormalized.length - sanitizeCallbackJobs(aggregatedNormalized).length,
    );
    await emitHeartbeat(
      'normalize',
      attemptsExecuted,
      aggregatedPages.length,
      aggregatedJobLinks.size,
      sanitizedJobs.length,
      true,
      { dedupedInRunCount },
    );
    await emitExecutionEvent(
      'normalization',
      assessedJobs.rejectedOfferCount > 0 ? 'warning' : 'success',
      'Normalization completed',
      'NORMALIZATION_COMPLETED',
      {
        acceptedOfferCount: assessedJobs.acceptedOfferCount,
        rejectedOfferCount: assessedJobs.rejectedOfferCount,
        rejectedOfferReasons: assessedJobs.rejectedOfferReasons,
        dedupedInRunCount,
      },
    );
    const { blockedRate, resultKind, emptyReason, sourceQuality } = resolveScrapeCompletionDiagnostics({
      sanitizedCount: sanitizedJobs.length,
      jobLinkCount: aggregatedJobLinks.size,
      blockedUrlCount: aggregatedBlockedUrls.length,
      hadZeroOffersStep,
      rejectedOfferCount: assessedJobs.rejectedOfferCount,
    });
    const finalPolicy =
      adaptiveDelayApplied > 0 ? `adaptive-delay:${adaptiveDetailDelayMs ?? options.detailDelayMs ?? 0}` : 'default';
    const classifiedOutcome = classifyScrapeOutcome({
      status: 'COMPLETED',
      resultKind,
      emptyReason,
      scrapedCount: sanitizedJobs.length,
    });
    const normalizationStartedAt = Date.now();
    const outputPath = await saveOutput(
      {
        source: payload.source,
        runId,
        listingUrl,
        fetchedAt: new Date().toISOString(),
        jobs: sanitizedJobs,
        raw: aggregatedParsedJobs,
        pages: aggregatedPages,
        blockedUrls: aggregatedBlockedUrls,
        jobLinks: Array.from(aggregatedJobLinks),
        listingHtml,
        listingData,
        listingSummaries,
        detailDiagnostics: aggregatedDiagnostics,
      },
      options.outputDir,
      options.outputMode,
    );

    if (callbackUrl) {
      const emittedAt = new Date().toISOString();
      const callbackBasePayload = buildScrapeCallbackPayload({
        eventId: callbackEventId,
        source: payload.source,
        runId,
        sourceRunId,
        traceId,
        attemptNo: Math.max(1, attemptsExecuted),
        emittedAt,
        listingUrl,
        status: 'COMPLETED',
        scrapedCount: sanitizedJobs.length,
        totalFound: aggregatedJobLinks.size,
        jobCount: sanitizedJobs.length,
        jobLinkCount: aggregatedJobLinks.size,
        jobs: sanitizedJobs,
        outputPath,
        diagnostics: {
          relaxationTrail,
          blockedUrls: aggregatedBlockedUrls,
          pagesVisited: aggregatedPages.length,
          jobLinksDiscovered: aggregatedJobLinks.size,
          ignoredRecommendedLinks: aggregatedRecommendedLinks.size,
          dedupedInRunCount,
          acceptedOfferCount: assessedJobs.acceptedOfferCount,
          rejectedOfferCount: assessedJobs.rejectedOfferCount,
          rejectedOfferReasons: assessedJobs.rejectedOfferReasons,
          skippedFreshUrls: Math.max(
            0,
            aggregatedJobLinks.size - aggregatedPages.length - aggregatedBlockedUrls.length,
          ),
          blockedPages: aggregatedBlockedUrls.length,
          hadZeroOffersStep,
          attemptCount: attemptsExecuted,
          adaptiveDelayApplied,
          blockedRate,
          finalPolicy,
          resultKind,
          emptyReason,
          sourceQuality,
          classifiedOutcome,
        },
      });
      const callbackPayload = {
        ...callbackBasePayload,
        payloadHash: computeCallbackPayloadHash(callbackBasePayload as Record<string, unknown>),
      };
      await emitHeartbeat(
        'callback',
        attemptsExecuted,
        aggregatedPages.length,
        aggregatedJobLinks.size,
        sanitizedJobs.length,
        true,
        { finalPolicy, blockedRate },
      );
      await notifyCallback(
        callbackUrl,
        callbackToken,
        callbackOidcAudience,
        callbackSigningSecret,
        payload.requestId,
        callbackPayload,
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
          retryMaxDelayMs: options.callbackRetryMaxDelayMs ?? 10000,
          retryJitterPct: options.callbackRetryJitterPct ?? 0.2,
          deadLetterDir: options.callbackDeadLetterDir,
          onRejected: async ({ attempt, statusCode, error }) => {
            await emitExecutionEvent(
              'callback_dispatch',
              'warning',
              'Callback delivery attempt was rejected',
              'CALLBACK_REJECTED',
              {
                attempt,
                statusCode: statusCode ?? null,
                error,
              },
            );
          },
          onRetryScheduled: async ({ attempt, nextAttempt, delayMs, error }) => {
            await emitExecutionEvent(
              'callback_retry',
              'warning',
              'Callback retry scheduled',
              'CALLBACK_RETRY_SCHEDULED',
              {
                attempt,
                nextAttempt,
                delayMs,
                error,
              },
            );
          },
          onAccepted: async ({ attempt, statusCode, durationMs }) => {
            await emitExecutionEvent('callback_dispatch', 'success', 'Callback accepted by API', 'CALLBACK_ACCEPTED', {
              attempt,
              statusCode,
              durationMs,
              totalFound: aggregatedJobLinks.size,
              scrapedCount: sanitizedJobs.length,
              resultKind,
              emptyReason,
              sourceQuality,
              classifiedOutcome,
            });
          },
          onDeadLettered: async ({ attempts, error }) => {
            await emitExecutionEvent(
              'callback_dead_letter',
              'failed',
              'Callback moved to dead letter after retries',
              'CALLBACK_DEAD_LETTERED',
              {
                attempts,
                error,
              },
            );
          },
        },
        logger,
      );
    }

    logger.info(
      {
        requestId: payload.requestId,
        source: payload.source,
        runId,
        sourceRunId,
        traceId,
        pages: aggregatedPages.length,
        jobs: sanitizedJobs.length,
        blockedPages: aggregatedBlockedUrls.length,
        ignoredRecommendedLinks: aggregatedRecommendedLinks.size,
        dedupedInRunCount,
        skippedFreshUrls: Math.max(0, aggregatedJobLinks.size - aggregatedPages.length - aggregatedBlockedUrls.length),
        jobLinks: aggregatedJobLinks.size,
        outputPath,
        durationMs: Date.now() - startedAt,
      },
      'Scrape completed',
    );
    await emitExecutionEvent('scrape_complete', 'success', 'Scrape completed successfully', 'SCRAPE_COMPLETED', {
      totalFound: aggregatedJobLinks.size,
      scrapedCount: sanitizedJobs.length,
      blockedPages: aggregatedBlockedUrls.length,
      ignoredRecommendedLinks: aggregatedRecommendedLinks.size,
      outputPath,
      durationMs: Date.now() - startedAt,
      normalizationDurationMs: Date.now() - normalizationStartedAt,
      classifiedOutcome,
    });

    return {
      count: sanitizedJobs.length,
      jobs: sanitizedJobs.slice(0, 5),
      outputPath,
      sourceRunId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown scrape failure';
    const failureType = classifyScrapeError(error);
    const callbackUrl = payload.callbackUrl ?? options.callbackUrl;
    const callbackToken = payload.callbackToken ?? options.callbackToken;
    const callbackOidcAudience = options.callbackOidcAudience;
    const callbackSigningSecret = options.callbackSigningSecret;
    if (callbackUrl) {
      const emittedAt = new Date().toISOString();
      const classifiedOutcome = classifyScrapeOutcome({
        status: 'FAILED',
        failureType,
        resultKind: 'failed',
        scrapedCount: 0,
      });
      const failedPayload = buildScrapeCallbackPayload({
        eventId: callbackEventId,
        source: payload.source,
        runId,
        sourceRunId,
        traceId,
        attemptNo: 1,
        emittedAt,
        listingUrl,
        status: 'FAILED',
        error: `[${failureType}] ${errorMessage}`,
        failureType,
        failureCode: `WORKER_${failureType.toUpperCase()}`,
        diagnostics: {
          relaxationTrail: [],
          blockedUrls: [],
          pagesVisited: 0,
          jobLinksDiscovered: 0,
          ignoredRecommendedLinks: 0,
          dedupedInRunCount: 0,
          acceptedOfferCount: 0,
          rejectedOfferCount: 0,
          rejectedOfferReasons: {},
          skippedFreshUrls: 0,
          blockedPages: 0,
          hadZeroOffersStep: false,
          attemptCount: 1,
          adaptiveDelayApplied: 0,
          blockedRate: 0,
          finalPolicy: 'failed',
          resultKind: 'failed',
          emptyReason: null,
          sourceQuality: 'failed',
          classifiedOutcome,
        },
      });
      await notifyCallback(
        callbackUrl,
        callbackToken,
        callbackOidcAudience,
        callbackSigningSecret,
        payload.requestId,
        {
          ...failedPayload,
          payloadHash: computeCallbackPayloadHash(failedPayload as Record<string, unknown>),
        },
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
          retryMaxDelayMs: options.callbackRetryMaxDelayMs ?? 10000,
          retryJitterPct: options.callbackRetryJitterPct ?? 0.2,
          deadLetterDir: options.callbackDeadLetterDir,
          onRejected: async ({ attempt, statusCode, error }) => {
            await appendScrapeExecutionEvent(options.databaseUrl, {
              sourceRunId,
              traceId,
              requestId: payload.requestId,
              stage: 'callback_dispatch',
              status: 'warning',
              code: 'CALLBACK_REJECTED',
              message: 'Failure callback delivery attempt was rejected',
              meta: {
                attempt,
                statusCode: statusCode ?? null,
                error,
              },
            });
          },
          onRetryScheduled: async ({ attempt, nextAttempt, delayMs, error }) => {
            await appendScrapeExecutionEvent(options.databaseUrl, {
              sourceRunId,
              traceId,
              requestId: payload.requestId,
              stage: 'callback_retry',
              status: 'warning',
              code: 'CALLBACK_RETRY_SCHEDULED',
              message: 'Failure callback retry scheduled',
              meta: {
                attempt,
                nextAttempt,
                delayMs,
                error,
              },
            });
          },
          onAccepted: async ({ attempt, statusCode, durationMs }) => {
            await appendScrapeExecutionEvent(options.databaseUrl, {
              sourceRunId,
              traceId,
              requestId: payload.requestId,
              stage: 'callback_dispatch',
              status: 'success',
              code: 'CALLBACK_ACCEPTED',
              message: 'Failure callback accepted by API',
              meta: {
                attempt,
                statusCode,
                durationMs,
                classifiedOutcome,
              },
            });
          },
          onDeadLettered: async ({ attempts, error }) => {
            await appendScrapeExecutionEvent(options.databaseUrl, {
              sourceRunId,
              traceId,
              requestId: payload.requestId,
              stage: 'callback_dead_letter',
              status: 'failed',
              code: 'CALLBACK_DEAD_LETTERED',
              message: 'Failure callback moved to dead letter after retries',
              meta: {
                attempts,
                error,
                classifiedOutcome,
              },
            });
          },
        },
        logger,
      );
    }

    await appendScrapeExecutionEvent(options.databaseUrl, {
      sourceRunId,
      traceId,
      requestId: payload.requestId,
      stage: 'scrape_failure',
      status: 'failed',
      code: `WORKER_${failureType.toUpperCase()}`,
      message: errorMessage,
      meta: {
        failureType,
        listingUrl,
        durationMs: Date.now() - startedAt,
      },
    }).catch((auditError) => {
      logger.warn(
        {
          sourceRunId,
          traceId,
          error: auditError instanceof Error ? auditError.message : String(auditError),
        },
        'Failed to persist scrape failure audit event',
      );
    });

    logger.error(
      {
        requestId: payload.requestId,
        source: payload.source,
        runId,
        sourceRunId,
        traceId,
        failureType,
        error: errorMessage,
        durationMs: Date.now() - startedAt,
      },
      'Scrape failed',
    );
    throw error;
  }
};

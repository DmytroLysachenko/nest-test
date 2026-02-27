import { createHmac, randomUUID } from 'crypto';
import type { Logger } from 'pino';
import type { PracujSourceKind, ScrapeFilters } from '@repo/db';

import { persistDeadLetter } from './callback-dead-letter';
import { relaxPracujFiltersOnce } from './pracuj-filter-relaxation';
import { resolvePipeline, runPipeline } from './scrape-pipelines';
import { saveOutput } from '../output/save-output';
import { loadFreshOfferUrls } from '../db/fresh-offers';
import type { ScrapeSourceJob } from '../types/jobs';
import type { DetailFetchDiagnostics, ListingJobSummary, NormalizedJob, ParsedJob, RawPage } from '../sources/types';

type CallbackPayload = {
  eventId?: string;
  source: string;
  runId: string;
  sourceRunId?: string;
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
  };
};

export type ScrapeFailureType = 'validation' | 'network' | 'parse' | 'callback' | 'timeout' | 'unknown';

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const toError = (error: unknown) => (error instanceof Error ? error : new Error('Unknown error'));
const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const sanitizeStringArray = (value: string[] | undefined) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

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
    });
  }

  return Array.from(dedupByCanonical.values());
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
  signingSecret: string | undefined,
  requestId: string | undefined,
  payload: CallbackPayload,
  options: {
    retryAttempts: number;
    retryBackoffMs: number;
    retryMaxDelayMs: number;
    retryJitterPct: number;
    deadLetterDir?: string;
  },
  logger: Logger,
) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
    try {
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(signature ? { 'x-worker-signature': signature, 'x-worker-timestamp': String(timestampSec) } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Callback rejected (${response.status}): ${text}`);
        logger.warn({ requestId, status: response.status, body: text, attempt }, 'Callback rejected');
      } else {
        logger.info({ requestId, status: response.status, attempt }, 'Callback acknowledged');
        return;
      }
    } catch (error) {
      lastError = error;
      logger.warn({ requestId, error, attempt }, 'Failed to notify callback');
    }
    if (attempt < options.retryAttempts) {
      await sleep(
        computeCallbackRetryDelayMs(attempt, options.retryBackoffMs, options.retryMaxDelayMs, options.retryJitterPct),
      );
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
  logger.error({ requestId, error: lastError }, 'Callback failed after retries');
};

export const buildScrapeCallbackPayload = (input: CallbackPayload) => ({
  eventId: input.eventId,
  source: input.source,
  runId: input.runId,
  sourceRunId: input.sourceRunId,
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
    callbackDeadLetterDir?: string;
    scrapeTimeoutMs?: number;
    databaseUrl?: string;
  },
) => {
  const startedAt = Date.now();
  const runId = payload.runId ?? `run-${Date.now()}`;
  const callbackEventId = randomUUID();
  const sourceRunId = payload.sourceRunId;
  const pipeline = resolvePipeline(payload.source);
  const listingUrl = payload.listingUrl ?? (payload.filters ? pipeline.buildListingUrl(payload.filters) : undefined);
  if (!listingUrl) {
    throw new Error('listingUrl or filters are required');
  }

  try {
    const callbackUrl = payload.callbackUrl ?? options.callbackUrl;
    const callbackToken = payload.callbackToken ?? options.callbackToken;
    const callbackSigningSecret = options.callbackSigningSecret;

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
      if (attempt > 1 && relaxReason) {
        logger.info(
          {
            requestId: payload.requestId,
            sourceRunId,
            attempt,
            relaxReason,
            activeFilters,
          },
          'Retrying scrape with relaxed filters',
        );
      }

      const remaining = Math.max(1, requestedLimit - collectedKeys.size);
      const pipelinePromise = runPipeline(payload.source, {
        headless: options.headless,
        listingUrl: attemptListingUrl,
        limit: remaining,
        logger,
        options: {
          listingDelayMs: options.listingDelayMs,
          listingCooldownMs: options.listingCooldownMs,
          detailDelayMs: options.detailDelayMs,
          listingOnly: options.listingOnly,
          detailHost: options.detailHost,
          detailCookiesPath: options.detailCookiesPath,
          detailHumanize: options.detailHumanize,
          profileDir: options.profileDir,
          skipUrls,
          skipResolver: (urls: string[]) =>
            loadFreshOfferUrls(options.databaseUrl, 'PRACUJ_PL', urls, options.detailCacheHours ?? 24),
        },
      });

      const { crawlResult, parsedJobs, normalized } = await Promise.race([pipelinePromise, timeoutPromiseTemplate]);
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

    const sanitizedJobs = sanitizeCallbackJobs(aggregatedNormalized);
    const dedupedInRunCount = Math.max(0, aggregatedNormalized.length - sanitizedJobs.length);
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
      await notifyCallback(
        callbackUrl,
        callbackToken,
        callbackSigningSecret,
        payload.requestId,
        buildScrapeCallbackPayload({
          eventId: callbackEventId,
          source: payload.source,
          runId,
          sourceRunId,
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
            skippedFreshUrls: Math.max(
              0,
              aggregatedJobLinks.size - aggregatedPages.length - aggregatedBlockedUrls.length,
            ),
            blockedPages: aggregatedBlockedUrls.length,
            hadZeroOffersStep,
          },
        }),
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
          retryMaxDelayMs: options.callbackRetryMaxDelayMs ?? 10000,
          retryJitterPct: options.callbackRetryJitterPct ?? 0.2,
          deadLetterDir: options.callbackDeadLetterDir,
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
    const callbackSigningSecret = options.callbackSigningSecret;
    if (callbackUrl) {
      await notifyCallback(
        callbackUrl,
        callbackToken,
        callbackSigningSecret,
        payload.requestId,
        buildScrapeCallbackPayload({
          eventId: callbackEventId,
          source: payload.source,
          runId,
          sourceRunId,
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
            skippedFreshUrls: 0,
            blockedPages: 0,
            hadZeroOffersStep: false,
          },
        }),
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
          retryMaxDelayMs: options.callbackRetryMaxDelayMs ?? 10000,
          retryJitterPct: options.callbackRetryJitterPct ?? 0.2,
          deadLetterDir: options.callbackDeadLetterDir,
        },
        logger,
      );
    }

    logger.error(
      {
        requestId: payload.requestId,
        source: payload.source,
        runId,
        sourceRunId,
        failureType,
        error: errorMessage,
        durationMs: Date.now() - startedAt,
      },
      'Scrape failed',
    );
    throw error;
  }
};

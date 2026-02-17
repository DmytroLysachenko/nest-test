import { createHmac } from 'crypto';
import type { Logger } from 'pino';

import { persistDeadLetter } from './callback-dead-letter';
import { resolvePipeline, runPipeline } from './scrape-pipelines';
import { saveOutput } from '../output/save-output';
import type { ScrapeSourceJob } from '../types/jobs';
import type { NormalizedJob } from '../sources/types';

type CallbackPayload = {
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
};

export type ScrapeFailureType = 'validation' | 'network' | 'parse' | 'callback' | 'timeout' | 'unknown';

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const toError = (error: unknown) => (error instanceof Error ? error : new Error('Unknown error'));
const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const sanitizeStringArray = (value: string[] | undefined) =>
  Array.from(
    new Set(
      (value ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

export const sanitizeCallbackJobs = (jobs: NormalizedJob[] | undefined) => {
  if (!jobs?.length) {
    return [];
  }

  const dedupByUrl = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const url = normalizeString(job.url);
    const title = normalizeString(job.title);
    const description = normalizeString(job.description);
    if (!url || !title || !description) {
      continue;
    }

    const dedupeKey = url.toLowerCase();
    if (dedupByUrl.has(dedupeKey)) {
      continue;
    }

    dedupByUrl.set(dedupeKey, {
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

  return Array.from(dedupByUrl.values());
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
) => `${timestampSec}.${payload.sourceRunId ?? ''}.${payload.status}.${payload.runId}.${requestId ?? ''}`;

const notifyCallback = async (
  url: string,
  token: string | undefined,
  signingSecret: string | undefined,
  requestId: string | undefined,
  payload: CallbackPayload,
  options: {
    retryAttempts: number;
    retryBackoffMs: number;
    deadLetterDir?: string;
  },
  logger: Logger,
) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
    try {
      const timestampSec = Math.floor(Date.now() / 1000);
      const signaturePayload = buildWorkerCallbackSignaturePayload(payload, requestId, timestampSec);
      const signature = signingSecret ? createHmac('sha256', signingSecret).update(signaturePayload).digest('hex') : null;
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
      await sleep(attempt * options.retryBackoffMs);
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
    callbackDeadLetterDir?: string;
    scrapeTimeoutMs?: number;
  },
) => {
  const startedAt = Date.now();
  const runId = payload.runId ?? `run-${Date.now()}`;
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

    const pipelinePromise = runPipeline(payload.source, {
      headless: options.headless,
      listingUrl,
      limit: payload.limit,
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
      },
    });
    const timeoutMs = options.scrapeTimeoutMs ?? 180000;
    let timeoutRef: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutError = new Error(`Scrape timed out after ${timeoutMs}ms`);
      timeoutError.name = 'ScrapeTimeoutError';
      timeoutRef = setTimeout(() => reject(timeoutError), timeoutMs);
      timeoutRef?.unref?.();
    });

    const { crawlResult, parsedJobs, normalized } = await Promise.race([pipelinePromise, timeoutPromise]);
    const sanitizedJobs = sanitizeCallbackJobs(normalized);
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
    const {
      pages,
      blockedUrls,
      jobLinks,
      listingHtml,
      listingData,
      listingSummaries,
      detailDiagnostics,
    } = crawlResult;
    const outputPath = await saveOutput(
      {
        source: payload.source,
        runId,
        listingUrl,
        fetchedAt: new Date().toISOString(),
        jobs: sanitizedJobs,
        raw: parsedJobs,
        pages,
        blockedUrls,
        jobLinks,
        listingHtml,
        listingData,
        listingSummaries,
        detailDiagnostics,
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
          source: payload.source,
          runId,
          sourceRunId,
          listingUrl,
          status: 'COMPLETED',
          scrapedCount: sanitizedJobs.length,
          totalFound: jobLinks.length,
          jobCount: sanitizedJobs.length,
          jobLinkCount: jobLinks.length,
          jobs: sanitizedJobs,
          outputPath,
        }),
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
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
      pages: pages.length,
      jobs: sanitizedJobs.length,
        blockedPages: blockedUrls.length,
        jobLinks: jobLinks.length,
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
          source: payload.source,
          runId,
          sourceRunId,
          listingUrl,
          status: 'FAILED',
          error: `[${failureType}] ${errorMessage}`,
        }),
        {
          retryAttempts: options.callbackRetryAttempts ?? 3,
          retryBackoffMs: options.callbackRetryBackoffMs ?? 1000,
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

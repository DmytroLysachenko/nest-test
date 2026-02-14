import type { Logger } from 'pino';

import { persistDeadLetter } from './callback-dead-letter';
import { resolvePipeline, runPipeline } from './scrape-pipelines';
import { saveOutput } from '../output/save-output';
import type { ScrapeSourceJob } from '../types/jobs';

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

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const notifyCallback = async (
  url: string,
  token: string | undefined,
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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { 'x-request-id': requestId } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    callbackRetryAttempts?: number;
    callbackRetryBackoffMs?: number;
    callbackDeadLetterDir?: string;
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

    const { crawlResult, parsedJobs, normalized } = await runPipeline(payload.source, {
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
        jobs: normalized,
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
        payload.requestId,
        buildScrapeCallbackPayload({
          source: payload.source,
          runId,
          sourceRunId,
          listingUrl,
          status: 'COMPLETED',
          scrapedCount: normalized.length,
          totalFound: jobLinks.length,
          jobCount: normalized.length,
          jobLinkCount: jobLinks.length,
          jobs: normalized,
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
      jobs: normalized.length,
        blockedPages: blockedUrls.length,
        jobLinks: jobLinks.length,
        outputPath,
        durationMs: Date.now() - startedAt,
      },
      'Scrape completed',
    );

    return {
      count: normalized.length,
      jobs: normalized.slice(0, 5),
      outputPath,
      sourceRunId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown scrape failure';
    const callbackUrl = payload.callbackUrl ?? options.callbackUrl;
    const callbackToken = payload.callbackToken ?? options.callbackToken;
    if (callbackUrl) {
      await notifyCallback(
        callbackUrl,
        callbackToken,
        payload.requestId,
        buildScrapeCallbackPayload({
          source: payload.source,
          runId,
          sourceRunId,
          listingUrl,
          status: 'FAILED',
          error: errorMessage,
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
        error: errorMessage,
        durationMs: Date.now() - startedAt,
      },
      'Scrape failed',
    );
    throw error;
  }
};

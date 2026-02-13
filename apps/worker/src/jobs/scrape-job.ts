import type { Logger } from 'pino';

import { loadFreshOfferUrls } from '../db/fresh-offers';
import { markRunFailed, markRunRunning, persistScrapeResult } from '../db/persist-scrape';
import { saveOutput } from '../output/save-output';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
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
  error?: string;
};

const notifyCallback = async (
  url: string,
  token: string | undefined,
  requestId: string | undefined,
  payload: CallbackPayload,
  logger: Logger,
) => {
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
      logger.warn({ requestId, status: response.status, body: text }, 'Callback rejected');
      return;
    }
    logger.info({ requestId, status: response.status }, 'Callback acknowledged');
  } catch (error) {
    logger.warn({ requestId, error }, 'Failed to notify callback');
  }
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
    databaseUrl?: string;
    callbackUrl?: string;
    callbackToken?: string;
  },
) => {
  const startedAt = Date.now();
  const runId = payload.runId ?? `run-${Date.now()}`;
  let sourceRunId = payload.sourceRunId;

  if (payload.source !== 'pracuj-pl') {
    throw new Error(`Unknown source: ${payload.source}`);
  }

  const listingUrl = payload.listingUrl ?? (payload.filters ? buildPracujListingUrl(payload.filters) : undefined);
  if (!listingUrl) {
    throw new Error('listingUrl or filters are required');
  }

  await markRunRunning(options.databaseUrl, {
    source: payload.source,
    sourceRunId,
    userId: payload.userId,
    careerProfileId: payload.careerProfileId,
    listingUrl,
    filters: payload.filters,
  });

  try {
    const { pages, blockedUrls, jobLinks, listingHtml, listingData, listingSummaries, detailDiagnostics } =
      await crawlPracujPl(options.headless, listingUrl, payload.limit, logger, {
        listingDelayMs: options.listingDelayMs,
        listingCooldownMs: options.listingCooldownMs,
        detailDelayMs: options.detailDelayMs,
        listingOnly: options.listingOnly,
        detailHost: options.detailHost,
        detailCookiesPath: options.detailCookiesPath,
        detailHumanize: options.detailHumanize,
        profileDir: options.profileDir,
        skipResolver:
          options.databaseUrl && options.detailCacheHours && options.detailCacheHours > 0
            ? async (urls) => loadFreshOfferUrls(options.databaseUrl, 'PRACUJ_PL', urls, options.detailCacheHours!)
            : undefined,
      });

    const parsedJobs =
      pages.length > 0
        ? parsePracujPl(pages)
        : options.requireDetail
          ? []
          : listingSummaries.map((summary) => ({
              title: summary.title ?? 'Unknown title',
              company: summary.company,
              location: summary.location,
              description: summary.description ?? 'Listing summary only',
              url: summary.url,
              salary: summary.salary,
              sourceId: summary.sourceId,
              requirements: [],
              details: summary.details,
            }));
    const normalized = normalizePracujPl(parsedJobs);
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

    try {
      const dbRunId = await persistScrapeResult(options.databaseUrl, {
        source: payload.source,
        sourceRunId,
        listingUrl,
        filters: payload.filters,
        userId: payload.userId,
        careerProfileId: payload.careerProfileId,
        jobLinks,
        jobs: normalized,
      });
      if (dbRunId) {
        sourceRunId = dbRunId;
        logger.info({ sourceRunId: dbRunId }, 'Scrape results persisted');
      }
    } catch (error) {
      logger.error({ error, sourceRunId }, 'Failed to persist scrape results');
      throw error;
    }

    if (options.callbackUrl) {
      await notifyCallback(
        options.callbackUrl,
        options.callbackToken,
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
        }),
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
    await markRunFailed(options.databaseUrl, sourceRunId, errorMessage);

    if (options.callbackUrl) {
      await notifyCallback(
        options.callbackUrl,
        options.callbackToken,
        payload.requestId,
        buildScrapeCallbackPayload({
          source: payload.source,
          runId,
          sourceRunId,
          listingUrl,
          status: 'FAILED',
          error: errorMessage,
        }),
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

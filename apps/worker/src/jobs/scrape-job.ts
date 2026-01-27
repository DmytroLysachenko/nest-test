import type { Logger } from 'pino';

import type { ScrapeSourceJob } from '../types/jobs';
import { saveOutput } from '../output/save-output';

import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
import { persistScrapeResult } from '../db/persist-scrape';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';
import { loadFreshOfferUrls } from '../db/fresh-offers';

const notifyCallback = async (
  url: string,
  token: string | undefined,
  payload: Record<string, unknown>,
  logger: Logger,
) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      logger.warn({ status: response.status, body: text }, 'Callback rejected');
      return;
    }
    logger.info({ status: response.status }, 'Callback acknowledged');
  } catch (error) {
    logger.warn({ error }, 'Failed to notify callback');
  }
};

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

  if (payload.source !== 'pracuj-pl') {
    throw new Error(`Unknown source: ${payload.source}`);
  }

  const listingUrl = payload.listingUrl ?? (payload.filters ? buildPracujListingUrl(payload.filters) : undefined);
  if (!listingUrl) {
    throw new Error('listingUrl or filters are required');
  }

  const { pages, blockedUrls, jobLinks, listingHtml, listingData, listingSummaries, detailDiagnostics } =
    await crawlPracujPl(
      options.headless,
      listingUrl,
      payload.limit,
      logger,
      {
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
            ? async (urls) =>
                loadFreshOfferUrls(options.databaseUrl, 'PRACUJ_PL', urls, options.detailCacheHours!)
            : undefined,
      },
    );
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
  const runId = payload.runId ?? `run-${Date.now()}`;
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
      listingUrl,
      filters: payload.filters,
      userId: payload.userId,
      careerProfileId: payload.careerProfileId,
      jobLinks,
      jobs: normalized,
    });
    if (dbRunId) {
      logger.info({ dbRunId }, 'Scrape results persisted');
      if (options.callbackUrl) {
        await notifyCallback(
          options.callbackUrl,
          options.callbackToken,
          {
            source: payload.source,
            runId,
            sourceRunId: dbRunId,
            listingUrl,
            jobCount: normalized.length,
            jobLinkCount: jobLinks.length,
          },
          logger,
        );
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to persist scrape results');
  }

  logger.info(
    {
      source: payload.source,
      runId,
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
  };
};

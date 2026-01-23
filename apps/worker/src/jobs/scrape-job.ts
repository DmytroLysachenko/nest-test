import type { Logger } from 'pino';

import type { ScrapeSourceJob } from '../types/jobs';
import { saveOutput } from '../output/save-output';

import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';

export const runScrapeJob = async (
  payload: ScrapeSourceJob,
  logger: Logger,
  options: {
    headless: boolean;
    outputDir?: string;
    listingDelayMs?: number;
    listingCooldownMs?: number;
    detailDelayMs?: number;
    listingOnly?: boolean;
    detailHost?: string;
    detailCookiesPath?: string;
    detailHumanize?: boolean;
    requireDetail?: boolean;
    profileDir?: string;
    outputMode?: 'full' | 'minimal';
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

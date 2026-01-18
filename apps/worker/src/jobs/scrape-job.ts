import type { Logger } from 'pino';

import type { ScrapeSourceJob } from '../types/jobs';
import { saveOutput } from '../output/save-output';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';

export const runScrapeJob = async (
  payload: ScrapeSourceJob,
  logger: Logger,
  options: { headless: boolean; outputDir?: string },
) => {
  const startedAt = Date.now();

  if (payload.source !== 'pracuj-pl') {
    throw new Error(`Unknown source: ${payload.source}`);
  }

  const pages = await crawlPracujPl(options.headless, payload.listingUrl, payload.limit, logger);
  const parsedJobs = parsePracujPl(pages);
  const normalized = normalizePracujPl(parsedJobs);
  const runId = payload.runId ?? `run-${Date.now()}`;
  const outputPath = await saveOutput(
    {
      source: payload.source,
      runId,
      listingUrl: payload.listingUrl,
      fetchedAt: new Date().toISOString(),
      jobs: normalized,
      raw: parsedJobs,
      pages,
    },
    options.outputDir,
  );

  logger.info(
    {
      source: payload.source,
      runId,
      pages: pages.length,
      jobs: normalized.length,
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

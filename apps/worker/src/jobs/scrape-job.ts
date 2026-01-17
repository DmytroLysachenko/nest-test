import type { Logger } from 'pino';

import type { ScrapeSourceJob } from '../types/jobs';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';

export const runScrapeJob = async (payload: ScrapeSourceJob, logger: Logger, options: { headless: boolean }) => {
  const startedAt = Date.now();

  if (payload.source !== 'pracuj-pl') {
    throw new Error(`Unknown source: ${payload.source}`);
  }

  const pages = await crawlPracujPl(options.headless, payload.listingUrl, payload.limit);
  const parsedJobs = parsePracujPl(pages);
  const normalized = normalizePracujPl(parsedJobs);

  logger.info(
    {
      source: payload.source,
      runId: payload.runId ?? null,
      pages: pages.length,
      jobs: normalized.length,
      durationMs: Date.now() - startedAt,
    },
    'Scrape completed',
  );

  return {
    count: normalized.length,
    jobs: normalized.slice(0, 5),
  };
};

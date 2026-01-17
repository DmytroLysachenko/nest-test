import { chromium } from 'playwright';
import { Logger } from 'pino';

import { ScrapeSourceJob } from '../types/jobs';

type SourceConfig = {
  url: string;
};

const SOURCES: Record<string, SourceConfig> = {
  'pracuj-pl': { url: 'https://www.pracuj.pl' },
};

export const runScrapeJob = async (
  payload: ScrapeSourceJob,
  logger: Logger,
  options: { headless: boolean },
) => {
  const sourceConfig = SOURCES[payload.source];
  if (!sourceConfig) {
    throw new Error(`Unknown source: ${payload.source}`);
  }

  const startedAt = Date.now();
  const browser = await chromium.launch({ headless: options.headless });

  try {
    const page = await browser.newPage();
    await page.goto(sourceConfig.url, { waitUntil: 'domcontentloaded' });
    const title = await page.title();

    logger.info(
      {
        source: payload.source,
        runId: payload.runId ?? null,
        title,
        durationMs: Date.now() - startedAt,
      },
      'Scrape completed',
    );

    return {
      title,
      url: sourceConfig.url,
    };
  } finally {
    await browser.close();
  }
};

import type { Logger } from 'pino';

import { runScrapeJob } from '../jobs/scrape-job';

import type { TaskEnvelope } from './task-types';

export const handleTask = async (
  task: TaskEnvelope,
  logger: Logger,
  options: {
    headless: boolean;
    outputDir?: string;
    listingDelayMs?: number;
    detailDelayMs?: number;
    listingOnly?: boolean;
    detailHost?: string;
  },
) => {
  switch (task.name) {
    case 'scrape:source':
      return runScrapeJob(task.payload, logger, {
        headless: options.headless,
        outputDir: options.outputDir,
        listingDelayMs: options.listingDelayMs,
        detailDelayMs: options.detailDelayMs,
        listingOnly: options.listingOnly,
        detailHost: options.detailHost,
      });
    default:
      throw new Error(`Unhandled task type: ${task.name}`);
  }
};

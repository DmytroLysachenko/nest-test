import type { Logger } from 'pino';

import { runScrapeJob } from '../jobs/scrape-job';

import type { TaskEnvelope } from './task-types';

export const handleTask = async (
  task: TaskEnvelope,
  logger: Logger,
  options: { headless: boolean; outputDir?: string },
) => {
  switch (task.name) {
    case 'scrape:source':
      return runScrapeJob(task.payload, logger, {
        headless: options.headless,
        outputDir: options.outputDir,
      });
    default:
      throw new Error(`Unhandled task type: ${task.name}`);
  }
};

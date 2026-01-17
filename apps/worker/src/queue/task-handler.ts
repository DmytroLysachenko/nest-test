import { Logger } from 'pino';

import { runScrapeJob } from '../jobs/scrape-job';

import { TaskEnvelope } from './task-types';

export const handleTask = async (
  task: TaskEnvelope,
  logger: Logger,
  options: { headless: boolean },
) => {
  switch (task.name) {
    case 'scrape:source':
      return runScrapeJob(task.payload, logger, { headless: options.headless });
    default:
      throw new Error(`Unhandled task type: ${task.name}`);
  }
};

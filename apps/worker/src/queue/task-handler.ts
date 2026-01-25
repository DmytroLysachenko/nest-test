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
  switch (task.name) {
    case 'scrape:source':
      return runScrapeJob(task.payload, logger, {
        headless: options.headless,
        outputDir: options.outputDir,
        listingDelayMs: options.listingDelayMs,
        listingCooldownMs: options.listingCooldownMs,
        detailDelayMs: options.detailDelayMs,
        listingOnly: options.listingOnly,
        detailHost: options.detailHost,
        detailCookiesPath: options.detailCookiesPath,
        detailHumanize: options.detailHumanize,
        requireDetail: options.requireDetail,
        profileDir: options.profileDir,
        outputMode: options.outputMode,
      });
    default:
      throw new Error(`Unhandled task type: ${task.name}`);
  }
};

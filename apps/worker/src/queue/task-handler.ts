import { runScrapeJob } from '../jobs/scrape-job';

import type { Logger } from 'pino';
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
    browserFallbackCooldownMs?: number;
    detailCacheHours?: number;
    listingOnly?: boolean;
    detailHost?: string;
    detailCookiesPath?: string;
    detailHumanize?: boolean;
    requireDetail?: boolean;
    profileDir?: string;
    outputMode?: 'full' | 'minimal';
    outputRetentionHours?: number;
    callbackUrl?: string;
    callbackToken?: string;
    callbackOidcAudience?: string;
    callbackSigningSecret?: string;
    callbackRetryAttempts?: number;
    callbackRetryBackoffMs?: number;
    callbackRetryMaxDelayMs?: number;
    callbackRetryJitterPct?: number;
    heartbeatIntervalMs?: number;
    callbackDeadLetterDir?: string;
    scrapeTimeoutMs?: number;
    databaseUrl?: string;
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
        browserFallbackCooldownMs: options.browserFallbackCooldownMs,
        detailCacheHours: options.detailCacheHours,
        listingOnly: options.listingOnly,
        detailHost: options.detailHost,
        detailCookiesPath: options.detailCookiesPath,
        detailHumanize: options.detailHumanize,
        requireDetail: options.requireDetail,
        profileDir: options.profileDir,
        outputMode: options.outputMode,
        outputRetentionHours: options.outputRetentionHours,
        callbackUrl: options.callbackUrl,
        callbackToken: options.callbackToken,
        callbackOidcAudience: options.callbackOidcAudience,
        callbackSigningSecret: options.callbackSigningSecret,
        callbackRetryAttempts: options.callbackRetryAttempts,
        callbackRetryBackoffMs: options.callbackRetryBackoffMs,
        callbackRetryMaxDelayMs: options.callbackRetryMaxDelayMs,
        callbackRetryJitterPct: options.callbackRetryJitterPct,
        heartbeatIntervalMs: options.heartbeatIntervalMs,
        callbackDeadLetterDir: options.callbackDeadLetterDir,
        scrapeTimeoutMs: options.scrapeTimeoutMs,
        databaseUrl: options.databaseUrl,
      });
    default:
      throw new Error(`Unhandled task type: ${task.name}`);
  }
};

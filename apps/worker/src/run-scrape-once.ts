import { randomUUID } from 'crypto';

import { loadEnv } from './config/env';
import { createLogger } from './config/logger';
import { runScrapeJob } from './jobs/scrape-job';

const parseArgs = (argv: string[]) => {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
};

const main = async () => {
  const env = loadEnv();
  const logger = createLogger(env);
  const args = parseArgs(process.argv.slice(2));
  const source = String(args.source ?? 'pracuj-pl-it');
  const listingUrl = String(args.listingUrl ?? env.PRACUJ_LISTING_URL ?? '');
  const limit = Number(args.limit ?? env.PRACUJ_LISTING_LIMIT ?? 10);

  if (!listingUrl) {
    throw new Error('listingUrl is required. Pass --listingUrl <url> or set PRACUJ_LISTING_URL.');
  }

  const runId = `local-${Date.now()}`;
  await runScrapeJob(
    {
      source,
      runId,
      sourceRunId: String(args.sourceRunId ?? randomUUID()),
      traceId: randomUUID(),
      requestId: randomUUID(),
      listingUrl,
      limit,
    },
    logger,
    {
      headless: env.PLAYWRIGHT_HEADLESS,
      outputDir: env.WORKER_OUTPUT_DIR,
      listingDelayMs: env.PRACUJ_LISTING_DELAY_MS,
      listingCooldownMs: env.PRACUJ_LISTING_COOLDOWN_MS,
      detailDelayMs: env.PRACUJ_DETAIL_DELAY_MS,
      browserFallbackCooldownMs: env.PRACUJ_BROWSER_FALLBACK_COOLDOWN_MS,
      detailCacheHours: env.PRACUJ_DETAIL_CACHE_HOURS,
      listingOnly: args.listingOnly === true ? true : env.PRACUJ_LISTING_ONLY,
      detailHost: env.PRACUJ_DETAIL_HOST,
      detailCookiesPath: env.PRACUJ_DETAIL_COOKIES_PATH,
      detailHumanize: env.PRACUJ_DETAIL_HUMANIZE,
      requireDetail: env.PRACUJ_REQUIRE_DETAIL,
      profileDir: env.PRACUJ_PROFILE_DIR,
      outputMode: env.WORKER_OUTPUT_MODE,
      outputRetentionHours: env.WORKER_OUTPUT_RETENTION_HOURS,
      callbackUrl: undefined,
      callbackToken: undefined,
      callbackSigningSecret: undefined,
      callbackRetryAttempts: env.WORKER_CALLBACK_RETRY_ATTEMPTS,
      callbackRetryBackoffMs: env.WORKER_CALLBACK_RETRY_BACKOFF_MS,
      callbackRetryMaxDelayMs: env.WORKER_CALLBACK_RETRY_MAX_DELAY_MS,
      callbackRetryJitterPct: env.WORKER_CALLBACK_RETRY_JITTER_PCT,
      heartbeatIntervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      callbackDeadLetterDir: env.WORKER_DEAD_LETTER_DIR,
      callbackOidcAudience: undefined,
      scrapeTimeoutMs: env.WORKER_TASK_TIMEOUT_MS,
      databaseUrl: env.DATABASE_URL,
    },
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

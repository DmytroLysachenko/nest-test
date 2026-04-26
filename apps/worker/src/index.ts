import { createLogger } from './config/logger';
import { loadEnv } from './config/env';
import { createTaskServer } from './http/task-server';
import { runBrowserProbe } from './probes/browser-probe';

const env = loadEnv();
const logger = createLogger(env);

if (!env.DATABASE_URL) {
  logger.warn(
    'Worker DATABASE_URL is not configured; scrape execution events and fresh-offer cache lookups are disabled',
  );
}

if (env.WORKER_BROWSER_PROBE_ON_START) {
  runBrowserProbe(logger)
    .then((result) => {
      logger.info(result, 'Worker browser probe completed');
    })
    .catch((error) => {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker browser probe failed');
    });
}

const server = createTaskServer(env, logger);
const cloudRunPort = Number(process.env.PORT);
const listenPort = Number.isFinite(cloudRunPort) && cloudRunPort > 0 ? cloudRunPort : env.WORKER_PORT;

server.listen(listenPort, () => {
  logger.info(
    {
      port: listenPort,
      queueProvider: env.QUEUE_PROVIDER,
      concurrencyPolicy: {
        maxConcurrentTasks: env.WORKER_MAX_CONCURRENT_TASKS,
        maxQueueSize: env.WORKER_MAX_QUEUE_SIZE,
        taskTimeoutMs: env.WORKER_TASK_TIMEOUT_MS,
        detailConcurrency: env.PRACUJ_DETAIL_CONCURRENCY,
        detailDelayMs: env.PRACUJ_DETAIL_DELAY_MS,
        browserFallbackCooldownMs: env.PRACUJ_BROWSER_FALLBACK_COOLDOWN_MS,
      },
    },
    'Worker task server listening',
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down worker');
  server.close();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

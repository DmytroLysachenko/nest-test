import { createLogger } from './config/logger';
import { loadEnv } from './config/env';
import { createTaskServer } from './http/task-server';

const env = loadEnv();
const logger = createLogger(env);

if (!env.DATABASE_URL) {
  logger.warn(
    'Worker DATABASE_URL is not configured; scrape execution events and fresh-offer cache lookups are disabled',
  );
}

const server = createTaskServer(env, logger);
const cloudRunPort = Number(process.env.PORT);
const listenPort = Number.isFinite(cloudRunPort) && cloudRunPort > 0 ? cloudRunPort : env.WORKER_PORT;

server.listen(listenPort, () => {
  logger.info({ port: listenPort, queueProvider: env.QUEUE_PROVIDER }, 'Worker task server listening');
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

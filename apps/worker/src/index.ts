import { createLogger } from './config/logger';
import { loadEnv } from './config/env';
import { createTaskServer } from './http/task-server';

const env = loadEnv();
const logger = createLogger(env);

if (!env.DATABASE_URL) {
  logger.warn('DATABASE_URL is not set; DB features are disabled until configured');
}

const server = createTaskServer(env, logger);

server.listen(env.WORKER_PORT, () => {
  logger.info({ port: env.WORKER_PORT }, 'Worker task server listening');
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

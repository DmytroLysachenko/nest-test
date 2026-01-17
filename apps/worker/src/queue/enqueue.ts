import { randomUUID } from 'crypto';

import { createLogger } from '../config/logger';
import { loadEnv } from '../config/env';

import { enqueueCloudTask } from './cloud-tasks';
import type { TaskEnvelope } from './task-types';

const env = loadEnv();
const logger = createLogger(env);

const payload: TaskEnvelope = {
  name: 'scrape:source',
  payload: {
    source: 'pracuj-pl',
    runId: `run-${Date.now()}`,
    listingUrl: env.PRACUJ_LISTING_URL,
    limit: env.PRACUJ_LISTING_LIMIT,
  },
};

const run = async () => {
  if (env.QUEUE_PROVIDER === 'cloud-tasks') {
    await enqueueCloudTask(payload, env, logger);
    return;
  }

  const response = await fetch(`http://localhost:${env.WORKER_PORT}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': randomUUID(),
      ...(env.TASKS_AUTH_TOKEN ? { Authorization: `Bearer ${env.TASKS_AUTH_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    logger.error({ status: response.status, body }, 'Local enqueue failed');
    process.exit(1);
  }

  logger.info({ body }, 'Local task enqueued');
};

run().catch((error) => {
  logger.error({ error }, 'Failed to enqueue task');
  process.exit(1);
});

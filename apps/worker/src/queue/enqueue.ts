import { randomUUID } from 'crypto';

import { createLogger } from '../config/logger';
import { loadEnv } from '../config/env';

import { enqueueCloudTask } from './cloud-tasks';
import type { TaskEnvelope } from './task-types';

const env = loadEnv();
const logger = createLogger(env);

const readArg = (name: string) => {
  const index = process.argv.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (index === -1) {
    return undefined;
  }
  const token = process.argv[index];
  if (token.includes('=')) {
    return token.split('=').slice(1).join('=');
  }
  return process.argv[index + 1];
};

const parseLimit = (value?: string) => {
  if (!value) {
    return env.PRACUJ_LISTING_LIMIT;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return env.PRACUJ_LISTING_LIMIT;
  }
  return parsed;
};

const listingUrl = readArg('--listingUrl') ?? env.PRACUJ_LISTING_URL;
const limit = parseLimit(readArg('--limit'));
const workModes = readArg('--workModes')?.split(',').filter(Boolean);
const specializations = readArg('--specializations')?.split(',').filter(Boolean);
const location = readArg('--location');
const employmentTypes = readArg('--employmentTypes')?.split(',').filter(Boolean);
const experienceLevels = readArg('--experienceLevels')?.split(',').filter(Boolean);
const keywords = readArg('--keywords');

const payload: TaskEnvelope = {
  name: 'scrape:source',
  payload: {
    source: 'pracuj-pl',
    runId: `run-${Date.now()}`,
    listingUrl,
    limit,
    filters:
      workModes || specializations || location || employmentTypes || experienceLevels || keywords
        ? {
            workModes,
            specializations,
            location,
            employmentTypes,
            experienceLevels,
            keywords,
          }
        : undefined,
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

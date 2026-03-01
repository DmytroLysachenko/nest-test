import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { OAuth2Client } from 'google-auth-library';
import type { Logger } from 'pino';

import type { WorkerEnv } from '../config/env';

import { createTaskServer } from './task-server';

const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Logger;

const buildEnv = (overrides: Partial<WorkerEnv> = {}): WorkerEnv =>
  ({
    NODE_ENV: 'test',
    WORKER_LOG_LEVEL: 'silent',
    WORKER_PORT: 0,
    QUEUE_PROVIDER: 'cloud-tasks',
    TASKS_AUTH_TOKEN: undefined,
    TASKS_PROJECT_ID: 'project',
    TASKS_LOCATION: 'us-central1',
    TASKS_QUEUE: 'worker-tasks',
    TASKS_URL: 'https://worker.example.com/tasks',
    TASKS_SERVICE_ACCOUNT_EMAIL: 'expected-caller@example.iam.gserviceaccount.com',
    TASKS_OIDC_AUDIENCE: undefined,
    WORKER_CALLBACK_URL: undefined,
    WORKER_CALLBACK_TOKEN: undefined,
    WORKER_CALLBACK_OIDC_AUDIENCE: undefined,
    WORKER_CALLBACK_SIGNING_SECRET: undefined,
    WORKER_CALLBACK_RETRY_ATTEMPTS: 3,
    WORKER_CALLBACK_RETRY_BACKOFF_MS: 1000,
    WORKER_CALLBACK_RETRY_MAX_DELAY_MS: 10000,
    WORKER_CALLBACK_RETRY_JITTER_PCT: 0.2,
    WORKER_HEARTBEAT_INTERVAL_MS: 10000,
    WORKER_DEAD_LETTER_DIR: undefined,
    WORKER_MAX_BODY_BYTES: 262144,
    DATABASE_URL: undefined,
    PLAYWRIGHT_HEADLESS: true,
    PRACUJ_LISTING_URL: undefined,
    PRACUJ_LISTING_LIMIT: 10,
    WORKER_OUTPUT_DIR: undefined,
    PRACUJ_LISTING_DELAY_MS: 1500,
    PRACUJ_LISTING_COOLDOWN_MS: 0,
    PRACUJ_DETAIL_DELAY_MS: 2000,
    PRACUJ_DETAIL_CACHE_HOURS: 24,
    PRACUJ_LISTING_ONLY: false,
    PRACUJ_DETAIL_HOST: undefined,
    PRACUJ_DETAIL_COOKIES_PATH: undefined,
    PRACUJ_DETAIL_HUMANIZE: false,
    PRACUJ_REQUIRE_DETAIL: false,
    PRACUJ_PROFILE_DIR: undefined,
    WORKER_OUTPUT_MODE: 'minimal',
    WORKER_MAX_CONCURRENT_TASKS: 1,
    WORKER_MAX_QUEUE_SIZE: 100,
    WORKER_TASK_TIMEOUT_MS: 180000,
    ...overrides,
  }) as WorkerEnv;

const closeServer = async (server: ReturnType<typeof createTaskServer>) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

test('rejects /tasks when OIDC email claim does not match expected service account', async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = async () =>
    ({
      getPayload: () => ({
        email: 'unexpected-caller@example.iam.gserviceaccount.com',
      }),
    }) as any;

  const server = createTaskServer(buildEnv(), logger);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer fake-id-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'scrape:source',
        payload: { source: 'pracuj-pl', listingUrl: 'https://it.pracuj.pl' },
      }),
    });

    assert.equal(response.status, 401);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, 'Unauthorized');
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    await closeServer(server);
  }
});

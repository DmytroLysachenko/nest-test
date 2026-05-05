import assert from 'node:assert/strict';
import test from 'node:test';

import { OAuth2Client } from 'google-auth-library';

import { createTaskServer } from './task-server';

import type { AddressInfo } from 'node:net';
import type { Logger } from 'pino';
import type { WorkerEnv } from '../config/env';
import type { TaskEnvelope } from '../queue/task-types';

type VerifyIdTokenResult = Awaited<ReturnType<OAuth2Client['verifyIdToken']>>;

const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Logger;

const buildEnv = (overrides: Partial<WorkerEnv> = {}): WorkerEnv =>
  ({
    NODE_ENV: 'test',
    WORKER_ALLOWED_ORIGINS: 'http://localhost:3002,https://job-seek-web.example.com',
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
    PRACUJ_BROWSER_FALLBACK_MAX_COUNT: 3,
    PRACUJ_BROWSER_FALLBACK_BUDGET_MS: 30000,
    PRACUJ_DETAIL_CACHE_HOURS: 24,
    PRACUJ_LISTING_ONLY: false,
    PRACUJ_DETAIL_HOST: undefined,
    PRACUJ_DETAIL_COOKIES_PATH: undefined,
    PRACUJ_DETAIL_HUMANIZE: false,
    PRACUJ_REQUIRE_DETAIL: false,
    PRACUJ_PROFILE_DIR: undefined,
    WORKER_OUTPUT_STORAGE_BACKEND: 'filesystem',
    WORKER_OUTPUT_MODE: 'minimal',
    WORKER_OUTPUT_ALLOW_FULL_IN_PROD: false,
    WORKER_OUTPUT_RAW_SAMPLE_LIMIT: 5,
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
  OAuth2Client.prototype.verifyIdToken = (async () =>
    ({
      getPayload: () => ({
        email: 'unexpected-caller@example.iam.gserviceaccount.com',
      }),
    }) as unknown as VerifyIdTokenResult) as unknown as OAuth2Client['verifyIdToken'];

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

test('rejects /tasks when OIDC issuer claim is unexpected', async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = (async () =>
    ({
      getPayload: () => ({
        iss: 'https://issuer.example.com',
        email: 'expected-caller@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    }) as unknown as VerifyIdTokenResult) as unknown as OAuth2Client['verifyIdToken'];

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
        payload: { taskSchemaVersion: '1', source: 'pracuj-pl', listingUrl: 'https://it.pracuj.pl' },
      }),
    });

    assert.equal(response.status, 401);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    await closeServer(server);
  }
});

test('rejects /tasks when OIDC email claim is not verified for pinned service account', async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = (async () =>
    ({
      getPayload: () => ({
        iss: 'https://accounts.google.com',
        email: 'expected-caller@example.iam.gserviceaccount.com',
        email_verified: false,
      }),
    }) as unknown as VerifyIdTokenResult) as unknown as OAuth2Client['verifyIdToken'];

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
        payload: { taskSchemaVersion: '1', source: 'pracuj-pl', listingUrl: 'https://it.pracuj.pl' },
      }),
    });

    assert.equal(response.status, 401);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    await closeServer(server);
  }
});

test('returns CORS headers for allowed preflight origin', async () => {
  const server = createTaskServer(buildEnv(), logger);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3002',
        'Access-Control-Request-Method': 'POST',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3002');
  } finally {
    await closeServer(server);
  }
});

test('reports worker queue and concurrency policy on health', async () => {
  const server = createTaskServer(
    buildEnv({
      WORKER_MAX_CONCURRENT_TASKS: 2,
      WORKER_MAX_QUEUE_SIZE: 25,
      WORKER_TASK_TIMEOUT_MS: 120000,
      PRACUJ_DETAIL_CONCURRENCY: 3,
      PRACUJ_DETAIL_DELAY_MS: 1500,
      PRACUJ_BROWSER_FALLBACK_COOLDOWN_MS: 4500,
      PRACUJ_BROWSER_FALLBACK_MAX_COUNT: 4,
      PRACUJ_BROWSER_FALLBACK_BUDGET_MS: 18000,
      WORKER_OUTPUT_MODE: 'full',
      WORKER_OUTPUT_RAW_SAMPLE_LIMIT: 3,
    }),
    logger,
  );
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      ok: boolean;
      queue: { maxConcurrent: number; maxQueueSize: number; taskTimeoutMs: number };
      policy: {
        detailConcurrency: number;
        detailDelayMs: number;
        browserFallbackConcurrency: string;
        browserFallbackCooldownMs: number;
        browserFallbackMaxCount: number;
        browserFallbackBudgetMs: number;
        outputStorageBackend: string;
        outputMode: string;
        outputRawSampleLimit: number;
      };
    };

    assert.equal(body.ok, true);
    assert.equal(body.queue.maxConcurrent, 2);
    assert.equal(body.queue.maxQueueSize, 25);
    assert.equal(body.queue.taskTimeoutMs, 120000);
    assert.equal(body.policy.detailConcurrency, 3);
    assert.equal(body.policy.detailDelayMs, 1500);
    assert.equal(body.policy.browserFallbackConcurrency, 'serial');
    assert.equal(body.policy.browserFallbackCooldownMs, 4500);
    assert.equal(body.policy.browserFallbackMaxCount, 4);
    assert.equal(body.policy.browserFallbackBudgetMs, 18000);
    assert.equal(body.policy.outputStorageBackend, 'filesystem');
    assert.equal(body.policy.outputMode, 'full');
    assert.equal(body.policy.outputRawSampleLimit, 3);
  } finally {
    await closeServer(server);
  }
});

test('returns duplicate when a durable worker task execution lease is already active', async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = (async () =>
    ({
      getPayload: () => ({
        iss: 'https://accounts.google.com',
        email: 'expected-caller@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    }) as unknown as VerifyIdTokenResult) as unknown as OAuth2Client['verifyIdToken'];

  const server = createTaskServer(buildEnv({ WORKER_SMOKE_ACCEPT_ONLY: true }), logger, {
    claimWorkerTaskExecution: async () =>
      ({
        outcome: 'duplicate',
        execution: {
          taskId: 'task-active-1',
          leaseExpiresAt: new Date('2026-05-04T10:00:00.000Z'),
          status: 'accepted',
        },
      }) as const,
  });
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
        payload: {
          taskSchemaVersion: '1',
          source: 'pracuj-pl',
          sourceRunId: '2f149bf9-65fd-48b5-aec7-8dc86abfca78',
          taskId: 'task-new-1',
          listingUrl: 'https://it.pracuj.pl/praca',
        } satisfies TaskEnvelope['payload'],
      }),
    });

    assert.equal(response.status, 202);
    const body = (await response.json()) as { reason?: string; activeTaskId?: string };
    assert.equal(body.reason, 'active-task-execution');
    assert.equal(body.activeTaskId, 'task-active-1');
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    await closeServer(server);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from './env';

const withEnv = async (input: Record<string, string | undefined>, fn: () => void | Promise<void>) => {
  const backup = { ...process.env };
  process.env = { ...process.env, ...input };
  try {
    await fn();
  } finally {
    process.env = backup;
  }
};

test('cloud-tasks provider requires auth token or service account', async () => {
  await withEnv(
    {
      QUEUE_PROVIDER: 'cloud-tasks',
      TASKS_PROJECT_ID: 'project',
      TASKS_LOCATION: 'us-central1',
      TASKS_QUEUE: 'queue',
      TASKS_URL: 'https://example.com/tasks',
      TASKS_AUTH_TOKEN: undefined,
      TASKS_SERVICE_ACCOUNT_EMAIL: undefined,
    },
    () => {
      assert.throws(() => loadEnv(), /Cloud Tasks auth is not configured/);
    },
  );
});

test('cloud-tasks provider accepts service account auth without TASKS_AUTH_TOKEN', async () => {
  await withEnv(
    {
      QUEUE_PROVIDER: 'cloud-tasks',
      TASKS_PROJECT_ID: 'project',
      TASKS_LOCATION: 'us-central1',
      TASKS_QUEUE: 'queue',
      TASKS_URL: 'https://example.com/tasks',
      TASKS_AUTH_TOKEN: undefined,
      TASKS_SERVICE_ACCOUNT_EMAIL: 'tasks@example.iam.gserviceaccount.com',
    },
    () => {
      const env = loadEnv();
      assert.equal(env.TASKS_SERVICE_ACCOUNT_EMAIL, 'tasks@example.iam.gserviceaccount.com');
    },
  );
});

test('cloud-tasks TASKS_URL must end with /tasks or /scrape', async () => {
  await withEnv(
    {
      QUEUE_PROVIDER: 'cloud-tasks',
      TASKS_PROJECT_ID: 'project',
      TASKS_LOCATION: 'us-central1',
      TASKS_QUEUE: 'queue',
      TASKS_URL: 'https://example.com/invalid',
      TASKS_AUTH_TOKEN: 'token',
    },
    () => {
      assert.throws(() => loadEnv(), /TASKS_URL must end with \/tasks or \/scrape/);
    },
  );
});

test('cloud-tasks TASKS_URL must use https in production', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      QUEUE_PROVIDER: 'cloud-tasks',
      TASKS_PROJECT_ID: 'project',
      TASKS_LOCATION: 'us-central1',
      TASKS_QUEUE: 'queue',
      TASKS_URL: 'http://example.com/tasks',
      TASKS_AUTH_TOKEN: 'token',
    },
    () => {
      assert.throws(() => loadEnv(), /must use https in production mode/);
    },
  );
});

test('WORKER_CALLBACK_OIDC_AUDIENCE must use https in production', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      QUEUE_PROVIDER: 'local',
      WORKER_CALLBACK_OIDC_AUDIENCE: 'http://api.example.com',
    },
    () => {
      assert.throws(() => loadEnv(), /WORKER_CALLBACK_OIDC_AUDIENCE must use https in production mode/);
    },
  );
});

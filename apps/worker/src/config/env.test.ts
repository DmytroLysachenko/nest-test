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

test('cloud-tasks provider requires TASKS_AUTH_TOKEN', async () => {
  await withEnv(
    {
      QUEUE_PROVIDER: 'cloud-tasks',
      TASKS_PROJECT_ID: 'project',
      TASKS_LOCATION: 'us-central1',
      TASKS_QUEUE: 'queue',
      TASKS_URL: 'https://example.com/tasks',
      TASKS_AUTH_TOKEN: undefined,
    },
    () => {
      assert.throws(() => loadEnv(), /Missing Cloud Tasks env vars/);
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

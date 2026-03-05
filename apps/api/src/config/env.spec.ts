import { validateEnv } from './env';

const baseEnv = () => ({
  NODE_ENV: 'development',
  HOST: '0.0.0.0',
  PORT: '3000',
  ACCESS_TOKEN_SECRET: 'access',
  ACCESS_TOKEN_EXPIRATION: '15m',
  REFRESH_TOKEN_SECRET: 'refresh',
  REFRESH_TOKEN_EXPIRATION: '30d',
  MAIL_HOST: 'smtp.example.com',
  MAIL_PORT: '587',
  MAIL_SECURE: 'false',
  MAIL_USERNAME: 'user',
  MAIL_PASSWORD: 'password',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/app',
  GCS_BUCKET: 'bucket',
  ALLOWED_ORIGINS: 'http://localhost:3000',
});

describe('validateEnv', () => {
  it('requires cloud-tasks provider in production mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'http',
      }),
    ).toThrow('WORKER_TASK_PROVIDER must be cloud-tasks in production mode');
  });

  it('requires queue configuration in cloud-tasks provider mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        WORKER_TASK_PROVIDER: 'cloud-tasks',
      }),
    ).toThrow('Missing Cloud Tasks env vars');
  });

  it('requires https worker task url in production cloud-tasks mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASKS_PROJECT_ID: 'proj',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape',
        WORKER_TASK_URL: 'http://worker.local/tasks',
      }),
    ).toThrow('WORKER_TASK_URL must use https in production mode for cloud-tasks provider');
  });

  it('accepts valid cloud-tasks configuration', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASKS_PROJECT_ID: 'proj',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape',
        WORKER_TASK_URL: 'https://worker.example.com/tasks',
        WORKER_TASKS_SERVICE_ACCOUNT_EMAIL: 'worker@example.iam.gserviceaccount.com',
      }),
    ).not.toThrow();
  });

  it('accepts explicit global API throttle config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        API_THROTTLE_TTL_MS: '120000',
        API_THROTTLE_LIMIT: '120',
      }),
    ).not.toThrow();
  });

  it('rejects invalid global API throttle config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        API_THROTTLE_TTL_MS: '500',
      }),
    ).toThrow();
  });
});

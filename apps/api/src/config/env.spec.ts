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
  GOOGLE_OAUTH_CLIENT_ID: 'google-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'google-client-secret',
});

describe('validateEnv', () => {
  it('requires cloud-tasks provider in production mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/complete',
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
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/complete',
      }),
    ).toThrow('WORKER_TASK_URL must use https in production mode for cloud-tasks provider');
  });

  it('requires worker callback url in production mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASKS_PROJECT_ID: 'proj',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape',
        WORKER_TASK_URL: 'https://worker.example.com/tasks',
      }),
    ).toThrow('WORKER_CALLBACK_URL must be configured in production mode');
  });

  it('requires canonical worker callback completion endpoint', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/runs/abc/heartbeat',
      }),
    ).toThrow('WORKER_CALLBACK_URL must end with /api/job-sources/complete');
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
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/complete',
        WORKER_TASKS_SERVICE_ACCOUNT_EMAIL: 'worker@example.iam.gserviceaccount.com',
      }),
    ).not.toThrow();
  });

  it('rejects worker dispatch deadline below task timeout', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        WORKER_TASK_TIMEOUT_MS: '180000',
        WORKER_TASK_DISPATCH_DEADLINE_MS: '180000',
      }),
    ).toThrow('WORKER_TASK_DISPATCH_DEADLINE_MS must be greater than WORKER_TASK_TIMEOUT_MS');
  });

  it('rejects stale running threshold below dispatch deadline', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        WORKER_TASK_TIMEOUT_MS: '60000',
        WORKER_TASK_DISPATCH_DEADLINE_MS: '120000',
        SCRAPE_STALE_RUNNING_MINUTES: '2',
      }),
    ).toThrow('SCRAPE_STALE_RUNNING_MINUTES must exceed WORKER_TASK_DISPATCH_DEADLINE_MS');
  });

  it('requires canonical cloud-tasks ingress endpoint shape', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASKS_PROJECT_ID: 'proj',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape',
        WORKER_TASK_URL: 'https://worker.example.com/internal',
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/complete',
      }),
    ).toThrow('WORKER_TASK_URL must end with /tasks or /scrape for cloud-tasks provider');
  });

  it('accepts explicit grouped API throttle config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        API_READ_THROTTLE_TTL_MS: '120000',
        API_READ_THROTTLE_LIMIT: '120',
        API_WRITE_THROTTLE_LIMIT: '60',
        API_AUTH_THROTTLE_LIMIT: '12',
        API_SENSITIVE_THROTTLE_LIMIT: '8',
      }),
    ).not.toThrow();
  });

  it('rejects incomplete google oauth config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        GOOGLE_OAUTH_CLIENT_SECRET: undefined,
      }),
    ).toThrow('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together');
  });

  it('rejects retired Gemini models', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        GEMINI_MODEL: 'gemini-1.5-flash',
      }),
    ).toThrow('GEMINI_MODEL=gemini-1.5-flash is retired');
  });

  it('rejects unsupported Gemini locations', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        GEMINI_MODEL: 'gemini-2.5-flash',
        GCP_LOCATION: 'moon-base1',
      }),
    ).toThrow('GCP_LOCATION=moon-base1 is not in the supported Vertex AI Gemini allowlist');
  });

  it('rejects invalid grouped API throttle config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        API_READ_THROTTLE_TTL_MS: '500',
      }),
    ).toThrow();
  });

  it('accepts explicit scrape daily enqueue budget config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER: '80',
      }),
    ).not.toThrow();
  });

  it('accepts explicit null-expiry stale window config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        JOB_OFFERS_NULL_EXPIRY_STALE_HOURS: '168',
      }),
    ).not.toThrow();
  });

  it('rejects invalid null-expiry stale window config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        JOB_OFFERS_NULL_EXPIRY_STALE_HOURS: '0',
      }),
    ).toThrow();
  });

  it('accepts legacy auth throttle config as optional fallback during migration', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        AUTH_LOGIN_THROTTLE_LIMIT: '7',
        AUTH_LOGIN_THROTTLE_TTL_MS: '30000',
        AUTH_REFRESH_THROTTLE_LIMIT: '20',
        AUTH_REGISTER_THROTTLE_LIMIT: '5',
        AUTH_OTP_THROTTLE_LIMIT: '4',
      }),
    ).not.toThrow();
  });

  it('accepts scheduler trigger config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        SCHEDULER_AUTH_TOKEN: 'scheduler-token',
        SCHEDULER_TRIGGER_BATCH_SIZE: '10',
      }),
    ).not.toThrow();
  });

  it('accepts ops internal token config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        OPS_INTERNAL_TOKEN: 'ops-internal-token',
      }),
    ).not.toThrow();
  });

  it('rejects non-https ops alerts webhook in production mode', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        NODE_ENV: 'production',
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASKS_PROJECT_ID: 'proj',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape',
        WORKER_TASK_URL: 'https://worker.example.com/tasks',
        WORKER_CALLBACK_URL: 'https://api.example.com/api/job-sources/complete',
        OPS_ALERTS_WEBHOOK_URL: 'http://alerts.example.com/webhook',
      }),
    ).toThrow('OPS_ALERTS_WEBHOOK_URL must use https in production mode');
  });

  it('accepts ops alerts webhook config', () => {
    expect(() =>
      validateEnv({
        ...baseEnv(),
        OPS_ALERTS_WEBHOOK_URL: 'https://alerts.example.com/webhook',
        OPS_ALERTS_WEBHOOK_BEARER_TOKEN: 'alerts-token',
        OPS_ALERTS_WINDOW_HOURS: '12',
        OPS_ALERTS_COOLDOWN_MINUTES: '30',
      }),
    ).not.toThrow();
  });
});

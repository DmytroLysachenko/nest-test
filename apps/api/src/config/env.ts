import { z } from 'zod';

import {
  DEFAULT_GEMINI_MODEL,
  isLegacyGeminiModel,
  isSupportedGeminiLocation,
  isSupportedGeminiModel,
} from '@/common/modules/gemini/gemini-config';

export const EnvSchema = z.object({
  HOST: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRATION: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string(),
  MAIL_HOST: z.string(),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_SECURE: z.coerce.boolean().default(false),
  MAIL_USERNAME: z.string(),
  MAIL_PASSWORD: z.string(),
  DATABASE_URL: z.string(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default(DEFAULT_GEMINI_MODEL),
  GCP_LOCATION: z.string().default('us-central1'),
  DISK_HEALTH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.98),
  GCS_BUCKET: z.string(),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  API_PREFIX: z.string().default('api'),
  WORKER_TASK_PROVIDER: z.enum(['http', 'cloud-tasks']).default('http'),
  WORKER_TASK_URL: z.string().url().optional(),
  WORKER_AUTH_TOKEN: z.string().optional(),
  WORKER_TASKS_PROJECT_ID: z.string().optional(),
  WORKER_TASKS_LOCATION: z.string().optional(),
  WORKER_TASKS_QUEUE: z.string().optional(),
  WORKER_TASKS_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  WORKER_TASKS_OIDC_AUDIENCE: z.string().url().optional(),
  WORKER_CALLBACK_URL: z.string().url().optional(),
  WORKER_CALLBACK_TOKEN: z.string().optional(),
  WORKER_CALLBACK_OIDC_AUDIENCE: z.string().url().optional(),
  WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  WORKER_CALLBACK_SIGNING_SECRET: z.string().optional(),
  WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC: z.coerce.number().int().min(30).max(3600).default(300),
  WORKER_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600000).default(5000),
  API_THROTTLE_TTL_MS: z.coerce.number().int().min(1000).max(600000).default(60000),
  API_THROTTLE_LIMIT: z.coerce.number().int().min(5).max(1000).default(120),
  WORKER_TASK_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).max(5_000_000).default(262_144),
  API_BODY_LIMIT: z
    .string()
    .trim()
    .regex(/^\d+(b|kb|mb)$/i)
    .default('1mb'),
  SCRAPE_DB_REUSE_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  SCRAPE_MAX_ACTIVE_RUNS_PER_USER: z.coerce.number().int().min(1).max(20).default(2),
  SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER: z.coerce.number().int().min(1).max(500).default(40),
  SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC: z.coerce.number().int().min(0).max(600).default(30),
  SCRAPE_MAX_RETRY_CHAIN_DEPTH: z.coerce.number().int().min(1).max(20).default(5),
  SCHEDULER_AUTH_TOKEN: z.string().optional(),
  SCHEDULER_TRIGGER_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(20),
  OPS_INTERNAL_TOKEN: z.string().optional(),
  AUTO_SCORE_ON_INGEST: z.coerce.boolean().default(true),
  AUTO_SCORE_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  AUTO_SCORE_MIN_SCORE: z.coerce.number().int().min(0).max(100).default(0),
  AUTO_SCORE_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(2),
  NOTEBOOK_APPROX_VIOLATION_PENALTY: z.coerce.number().int().min(0).max(100).default(10),
  NOTEBOOK_APPROX_SCORED_BONUS: z.coerce.number().int().min(0).max(100).default(10),
  NOTEBOOK_EXPLORE_UNSCORED_BASE: z.coerce.number().int().min(0).max(100).default(0),
  AUTH_LOGIN_THROTTLE_TTL_MS: z.coerce.number().int().min(1000).max(600000).default(60000),
  AUTH_LOGIN_THROTTLE_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  AUTH_REFRESH_THROTTLE_TTL_MS: z.coerce.number().int().min(1000).max(600000).default(60000),
  AUTH_REFRESH_THROTTLE_LIMIT: z.coerce.number().int().min(1).max(200).default(10),
  AUTH_REGISTER_THROTTLE_TTL_MS: z.coerce.number().int().min(1000).max(600000).default(60000),
  AUTH_REGISTER_THROTTLE_LIMIT: z.coerce.number().int().min(1).max(50).default(3),
  AUTH_OTP_THROTTLE_TTL_MS: z.coerce.number().int().min(1000).max(600000).default(60000),
  AUTH_OTP_THROTTLE_LIMIT: z.coerce.number().int().min(1).max(50).default(3),
  WORKSPACE_SUMMARY_CACHE_TTL_SEC: z.coerce.number().int().min(0).max(300).default(0),
  JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  SCRAPE_STALE_PENDING_MINUTES: z.coerce.number().int().min(1).max(240).default(15),
  SCRAPE_STALE_RUNNING_MINUTES: z.coerce.number().int().min(1).max(1440).default(60),
  DOCUMENT_DIAGNOSTICS_WINDOW_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY: z.coerce.number().int().min(0).max(100).default(30),
  NOTEBOOK_EXPLORE_RECENCY_WEIGHT: z.coerce.number().int().min(0).max(100).default(5),
});

export type Env = z.infer<typeof EnvSchema>;

export const validateEnv = (env: Record<string, unknown>): Env => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `${key}: ${messages?.join(', ')}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${errorMessages}`);
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.WORKER_CALLBACK_OIDC_AUDIENCE) {
    const audienceUrl = new URL(parsed.data.WORKER_CALLBACK_OIDC_AUDIENCE);
    if (audienceUrl.protocol !== 'https:') {
      throw new Error('WORKER_CALLBACK_OIDC_AUDIENCE must use https in production mode');
    }
  }

  if (
    (parsed.data.GOOGLE_OAUTH_CLIENT_ID && !parsed.data.GOOGLE_OAUTH_CLIENT_SECRET) ||
    (!parsed.data.GOOGLE_OAUTH_CLIENT_ID && parsed.data.GOOGLE_OAUTH_CLIENT_SECRET)
  ) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together');
  }

  if (isLegacyGeminiModel(parsed.data.GEMINI_MODEL)) {
    throw new Error(
      `GEMINI_MODEL=${parsed.data.GEMINI_MODEL} is retired. Use a supported model such as ${DEFAULT_GEMINI_MODEL}.`,
    );
  }

  if (!isSupportedGeminiModel(parsed.data.GEMINI_MODEL)) {
    throw new Error(`GEMINI_MODEL=${parsed.data.GEMINI_MODEL} is not in the supported allowlist for this app runtime.`);
  }

  if (!isSupportedGeminiLocation(parsed.data.GCP_LOCATION)) {
    throw new Error(
      `GCP_LOCATION=${parsed.data.GCP_LOCATION} is not in the supported Vertex AI Gemini allowlist for this app runtime.`,
    );
  }

  if (
    parsed.data.WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL &&
    !parsed.data.WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL.includes('@')
  ) {
    throw new Error('WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL is invalid');
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.WORKER_TASK_PROVIDER !== 'cloud-tasks') {
    throw new Error('WORKER_TASK_PROVIDER must be cloud-tasks in production mode');
  }

  if (parsed.data.WORKER_TASK_PROVIDER === 'cloud-tasks') {
    const missing = [
      'WORKER_TASKS_PROJECT_ID',
      'WORKER_TASKS_LOCATION',
      'WORKER_TASKS_QUEUE',
      'WORKER_TASK_URL',
    ].filter((key) => !parsed.data[key as keyof Env]);

    if (missing.length) {
      throw new Error(`Missing Cloud Tasks env vars: ${missing.join(', ')}`);
    }

    if (
      parsed.data.WORKER_TASKS_SERVICE_ACCOUNT_EMAIL &&
      !parsed.data.WORKER_TASKS_SERVICE_ACCOUNT_EMAIL.includes('@')
    ) {
      throw new Error('WORKER_TASKS_SERVICE_ACCOUNT_EMAIL is invalid');
    }

    if (parsed.data.NODE_ENV === 'production' && parsed.data.WORKER_TASK_URL) {
      const workerTaskUrl = new URL(parsed.data.WORKER_TASK_URL);
      if (workerTaskUrl.protocol !== 'https:') {
        throw new Error('WORKER_TASK_URL must use https in production mode for cloud-tasks provider');
      }
    }
  }

  return parsed.data;
};

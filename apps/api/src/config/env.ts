import { z } from 'zod';

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
  MAIL_SECURE: z.coerce.boolean().default(false), // Use TLS (true for port 465)
  MAIL_USERNAME: z.string(),
  MAIL_PASSWORD: z.string(),
  DATABASE_URL: z.string(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GCP_LOCATION: z.string().default('us-central1'),
  DISK_HEALTH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.98),
  GCS_BUCKET: z.string(),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  API_PREFIX: z.string().default('api'),
  WORKER_TASK_URL: z.string().url().optional(),
  WORKER_AUTH_TOKEN: z.string().optional(),
  WORKER_CALLBACK_URL: z.string().url().optional(),
  WORKER_CALLBACK_TOKEN: z.string().optional(),
  WORKER_CALLBACK_SIGNING_SECRET: z.string().optional(),
  WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC: z.coerce.number().int().min(30).max(3600).default(300),
  WORKER_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600000).default(5000),
  WORKER_TASK_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).max(5_000_000).default(262_144),
  API_BODY_LIMIT: z
    .string()
    .trim()
    .regex(/^\d+(b|kb|mb)$/i)
    .default('1mb'),
  SCRAPE_DB_REUSE_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  SCRAPE_MAX_ACTIVE_RUNS_PER_USER: z.coerce.number().int().min(1).max(20).default(2),
  SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC: z.coerce.number().int().min(0).max(600).default(30),
  SCRAPE_MAX_RETRY_CHAIN_DEPTH: z.coerce.number().int().min(1).max(20).default(5),
  AUTO_SCORE_ON_INGEST: z.coerce.boolean().default(true),
  AUTO_SCORE_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  AUTO_SCORE_MIN_SCORE: z.coerce.number().int().min(0).max(100).default(0),
  AUTO_SCORE_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(2),
  NOTEBOOK_APPROX_VIOLATION_PENALTY: z.coerce.number().int().min(0).max(100).default(10),
  NOTEBOOK_APPROX_SCORED_BONUS: z.coerce.number().int().min(0).max(100).default(10),
  NOTEBOOK_EXPLORE_UNSCORED_BASE: z.coerce.number().int().min(0).max(100).default(0),
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
    throw new Error(parsed.error.message || 'Invalid environment variables');
  }
  return parsed.data;
};

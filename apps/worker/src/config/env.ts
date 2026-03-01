import { config } from 'dotenv';
import { z } from 'zod';

const parseBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) {
      return false;
    }
  }
  return value;
};

const booleanSchema = z.preprocess(parseBoolean, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_LOG_LEVEL: z.string().default('info'),
  WORKER_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  QUEUE_PROVIDER: z.enum(['local', 'cloud-tasks']).default('local'),
  TASKS_AUTH_TOKEN: z.string().optional(),
  TASKS_PROJECT_ID: z.string().optional(),
  TASKS_LOCATION: z.string().optional(),
  TASKS_QUEUE: z.string().optional(),
  TASKS_URL: z.string().url().optional(),
  TASKS_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  WORKER_CALLBACK_URL: z.string().url().optional(),
  WORKER_CALLBACK_TOKEN: z.string().optional(),
  WORKER_CALLBACK_SIGNING_SECRET: z.string().optional(),
  WORKER_CALLBACK_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  WORKER_CALLBACK_RETRY_BACKOFF_MS: z.coerce.number().int().min(100).max(10000).default(1000),
  WORKER_CALLBACK_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(100).max(60000).default(10000),
  WORKER_CALLBACK_RETRY_JITTER_PCT: z.coerce.number().min(0).max(1).default(0.2),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
  WORKER_DEAD_LETTER_DIR: z.string().optional(),
  WORKER_MAX_BODY_BYTES: z.coerce.number().int().min(1024).max(5_000_000).default(262_144),
  DATABASE_URL: z.string().min(1).optional(),
  PLAYWRIGHT_HEADLESS: booleanSchema.default(true),
  PRACUJ_LISTING_URL: z.string().url().optional(),
  PRACUJ_LISTING_LIMIT: z.coerce.number().int().min(1).max(100).optional(),
  WORKER_OUTPUT_DIR: z.string().optional(),
  PRACUJ_LISTING_DELAY_MS: z.coerce.number().int().min(0).max(30000).default(1500),
  PRACUJ_LISTING_COOLDOWN_MS: z.coerce.number().int().min(0).max(30000).default(0),
  PRACUJ_DETAIL_DELAY_MS: z.coerce.number().int().min(0).max(30000).default(2000),
  PRACUJ_DETAIL_CACHE_HOURS: z.coerce.number().int().min(0).max(720).default(24),
  PRACUJ_LISTING_ONLY: booleanSchema.default(false),
  PRACUJ_DETAIL_HOST: z.string().optional(),
  PRACUJ_DETAIL_COOKIES_PATH: z.string().optional(),
  PRACUJ_DETAIL_HUMANIZE: booleanSchema.default(false),
  PRACUJ_REQUIRE_DETAIL: booleanSchema.default(false),
  PRACUJ_PROFILE_DIR: z.string().optional(),
  WORKER_OUTPUT_MODE: z.enum(['full', 'minimal']).default('full'),
  WORKER_MAX_CONCURRENT_TASKS: z.coerce.number().int().min(1).max(5).default(1),
  WORKER_MAX_QUEUE_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
  WORKER_TASK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600000).default(180000),
});

export type WorkerEnv = z.infer<typeof envSchema>;

const formatEnvError = (error: z.ZodError) => {
  const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return issues.join(', ');
};

export const loadEnv = () => {
  config();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment: ${formatEnvError(parsed.error)}`);
  }
  const env = parsed.data;

  if (env.QUEUE_PROVIDER === 'cloud-tasks') {
    const missing = ['TASKS_PROJECT_ID', 'TASKS_LOCATION', 'TASKS_QUEUE', 'TASKS_URL', 'TASKS_AUTH_TOKEN'].filter(
      (key) => !env[key as keyof WorkerEnv],
    );
    if (missing.length) {
      throw new Error(`Missing Cloud Tasks env vars: ${missing.join(', ')}`);
    }

    const taskUrl = new URL(env.TASKS_URL!);
    if (!taskUrl.pathname.endsWith('/tasks') && !taskUrl.pathname.endsWith('/scrape')) {
      throw new Error('TASKS_URL must end with /tasks or /scrape for cloud-tasks provider');
    }
    if (env.NODE_ENV === 'production' && taskUrl.protocol !== 'https:') {
      throw new Error('TASKS_URL must use https in production mode');
    }
    if (env.TASKS_SERVICE_ACCOUNT_EMAIL && !env.TASKS_SERVICE_ACCOUNT_EMAIL.includes('@')) {
      throw new Error('TASKS_SERVICE_ACCOUNT_EMAIL is invalid');
    }
  }

  return env;
};

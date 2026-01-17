import { config } from 'dotenv';
import { z } from 'zod';

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
  DATABASE_URL: z.string().min(1).optional(),
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),
  PRACUJ_LISTING_URL: z.string().url().optional(),
  PRACUJ_LISTING_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
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
    const missing = ['TASKS_PROJECT_ID', 'TASKS_LOCATION', 'TASKS_QUEUE', 'TASKS_URL'].filter(
      (key) => !env[key as keyof WorkerEnv],
    );
    if (missing.length) {
      throw new Error(`Missing Cloud Tasks env vars: ${missing.join(', ')}`);
    }
  }

  return env;
};

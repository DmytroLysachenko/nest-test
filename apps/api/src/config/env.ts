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
});

export type Env = z.infer<typeof EnvSchema>;

export const validateEnv = (env: Record<string, unknown>): Env => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(parsed.error.message || 'Invalid environment variables');
  }
  return parsed.data;
};

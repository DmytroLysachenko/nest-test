import { z } from 'zod';

const booleanSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WORKER_URL: z.string().url(),
  NEXT_PUBLIC_ENABLE_TESTER: booleanSchema,
  NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_QUERY_STALE_TIME_MS: z.coerce.number().int().min(1_000).max(2_147_483_647),
  NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS: booleanSchema,
  NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS: z.coerce.number().int().min(10_000).max(600_000),
});

const isProduction = process.env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true' || process.env.CI === '1';
const isNextProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

const defaultApiUrl = isProduction && !isCI ? undefined : 'http://localhost:3000/api';
const defaultWorkerUrl = isProduction && !isCI ? undefined : 'http://localhost:4000';

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl,
  NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL ?? defaultWorkerUrl,
  NEXT_PUBLIC_ENABLE_TESTER: process.env.NEXT_PUBLIC_ENABLE_TESTER ?? 'true',
  NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? 'local-dev-google-client-id',
  NEXT_PUBLIC_QUERY_STALE_TIME_MS: process.env.NEXT_PUBLIC_QUERY_STALE_TIME_MS ?? '1800000',
  NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS: process.env.NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS ?? 'false',
  NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS: process.env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS ?? '60000',
});

if (!parsedEnv.success) {
  const errors = parsedEnv.error.flatten().fieldErrors;
  const errorMessages = Object.entries(errors)
    .map(([key, messages]) => `${key}: ${messages?.join(', ')}`)
    .join('; ');
  throw new Error(`Invalid frontend environment variables: ${errorMessages}`);
}

if (isProduction && !isCI && !isNextProductionBuild) {
  const assertPublicHttpsUrl = (name: 'NEXT_PUBLIC_API_URL' | 'NEXT_PUBLIC_WORKER_URL', value: string) => {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:') {
      throw new Error(`${name} must use https in production.`);
    }
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      throw new Error(`${name} cannot target localhost in production.`);
    }
  };
  assertPublicHttpsUrl('NEXT_PUBLIC_API_URL', parsedEnv.data.NEXT_PUBLIC_API_URL);
  assertPublicHttpsUrl('NEXT_PUBLIC_WORKER_URL', parsedEnv.data.NEXT_PUBLIC_WORKER_URL);
}

export const env = parsedEnv.data;

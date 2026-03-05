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
  NEXT_PUBLIC_QUERY_STALE_TIME_MS: z.coerce.number().int().min(1_000).max(600_000),
  NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS: booleanSchema,
  NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS: z.coerce.number().int().min(10_000).max(600_000),
});

const isProduction = process.env.NODE_ENV === 'production';
const defaultApiUrl = isProduction ? undefined : 'http://localhost:3000/api';
const defaultWorkerUrl = isProduction ? undefined : 'http://localhost:4000';

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl,
  NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL ?? defaultWorkerUrl,
  NEXT_PUBLIC_ENABLE_TESTER: process.env.NEXT_PUBLIC_ENABLE_TESTER ?? 'true',
  NEXT_PUBLIC_QUERY_STALE_TIME_MS: process.env.NEXT_PUBLIC_QUERY_STALE_TIME_MS ?? '30000',
  NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS: process.env.NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS ?? 'false',
  NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS: process.env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS ?? '60000',
});

if (!parsedEnv.success) {
  throw new Error(
    'Invalid frontend env. Check NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WORKER_URL, NEXT_PUBLIC_ENABLE_TESTER, NEXT_PUBLIC_QUERY_*.',
  );
}

export const env = parsedEnv.data;

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
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:4000',
  NEXT_PUBLIC_ENABLE_TESTER: process.env.NEXT_PUBLIC_ENABLE_TESTER ?? 'true',
});

if (!parsedEnv.success) {
  throw new Error(
    'Invalid frontend env. Check NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WORKER_URL, NEXT_PUBLIC_ENABLE_TESTER.',
  );
}

export const env = parsedEnv.data;

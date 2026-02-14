import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
});

if (!parsedEnv.success) {
  throw new Error('Invalid frontend env. Check NEXT_PUBLIC_API_URL.');
}

export const env = parsedEnv.data;

import { describe, expect, it, vi } from 'vitest';

describe('frontend env config', () => {
  it('rejects localhost urls in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api');
    vi.stubEnv('NEXT_PUBLIC_WORKER_URL', 'https://worker.example.com');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_TESTER', 'false');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID', 'client-id');
    vi.stubEnv('NEXT_PUBLIC_QUERY_STALE_TIME_MS', '30000');
    vi.stubEnv('NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS', 'false');
    vi.stubEnv('NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS', '60000');

    await expect(import('@/shared/config/env')).rejects.toThrow('NEXT_PUBLIC_API_URL must use https in production.');

    vi.unstubAllEnvs();
  });

  it('accepts public https urls in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api');
    vi.stubEnv('NEXT_PUBLIC_WORKER_URL', 'https://worker.example.com');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_TESTER', 'false');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID', 'client-id');
    vi.stubEnv('NEXT_PUBLIC_QUERY_STALE_TIME_MS', '30000');
    vi.stubEnv('NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS', 'false');
    vi.stubEnv('NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS', '60000');

    const { env } = await import('@/shared/config/env');
    expect(env.NEXT_PUBLIC_API_URL).toBe('https://api.example.com/api');

    vi.unstubAllEnvs();
  });
});

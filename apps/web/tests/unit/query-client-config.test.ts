import { describe, expect, it, vi } from 'vitest';

describe('createQueryClient', () => {
  it('uses frontend query env config', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api');
    vi.stubEnv('NEXT_PUBLIC_WORKER_URL', 'http://localhost:4000');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_TESTER', 'true');
    vi.stubEnv('NEXT_PUBLIC_QUERY_STALE_TIME_MS', '45000');
    vi.stubEnv('NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS', 'true');
    vi.stubEnv('NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS', '90000');

    const { createQueryClient } = await import('@/shared/lib/query/query-client');
    const client = createQueryClient();
    const queryDefaults = client.getDefaultOptions().queries;

    expect(queryDefaults?.staleTime).toBe(45_000);
    expect(queryDefaults?.refetchOnWindowFocus).toBe(true);
    expect(queryDefaults?.retry).toBe(1);

    vi.unstubAllEnvs();
  });
});

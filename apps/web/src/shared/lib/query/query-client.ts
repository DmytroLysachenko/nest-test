import { QueryClient } from '@tanstack/react-query';

import { env } from '@/shared/config/env';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: env.NEXT_PUBLIC_QUERY_STALE_TIME_MS,
        retry: 1,
        refetchOnWindowFocus: env.NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS,
      },
      mutations: {
        retry: 0,
      },
    },
  });

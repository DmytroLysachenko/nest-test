import { QueryClient } from '@tanstack/react-query';

import { env } from '@/shared/config/env';

import { QUERY_GC_TIME, QUERY_STALE_TIME } from './query-constants';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: env.NEXT_PUBLIC_QUERY_STALE_TIME_MS ?? QUERY_STALE_TIME.WORKFLOW_DATA,
        gcTime: QUERY_GC_TIME.DEFAULT,
        retry: 1,
        refetchOnWindowFocus: env.NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

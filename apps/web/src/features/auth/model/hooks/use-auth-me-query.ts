'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api/auth-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useAuthMeQuery = (token: string | null) =>
  useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.auth.me(token),
      queryFn: getCurrentUser,
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    }),
  );

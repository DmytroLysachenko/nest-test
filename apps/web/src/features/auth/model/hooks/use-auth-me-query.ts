'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api/auth-api';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { UserDto } from '@/shared/types/api';

export const useAuthMeQuery = (token: string | null, initialData?: UserDto | null) =>
  useQuery({
    queryKey: queryKeys.auth.me(token),
    queryFn: () => getCurrentUser(token),
    enabled: Boolean(token),
    ...(initialData ? { initialData } : {}),
    staleTime: QUERY_STALE_TIME.CORE_DATA,
    gcTime: QUERY_GC_TIME.LONG_LIVED,
  });

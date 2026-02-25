'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api/auth-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useAuthMeQuery = (token: string | null) =>
  useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.auth.me(token),
      queryFn: getCurrentUser,
    }),
  );


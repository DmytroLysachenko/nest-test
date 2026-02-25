'use client';

import { useQuery } from '@tanstack/react-query';

import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useProfileInputQueries = (token: string) => {
  const latestQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.profileInputs.latest(token),
      queryFn: getLatestProfileInput,
    }),
  );

  return {
    latestQuery,
  };
};


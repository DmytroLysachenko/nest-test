'use client';

import { useQuery } from '@tanstack/react-query';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useCareerProfileQueries = (token: string) => {
  const latestQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
    }),
  );

  return {
    latestQuery,
  };
};


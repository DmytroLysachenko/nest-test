'use client';

import { useQuery } from '@tanstack/react-query';

import { getJobMatchHistory } from '@/features/job-matching/api/job-matching-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useJobMatchingQueries = (token: string) => {
  const historyQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobMatching.list(token),
      queryFn: getJobMatchHistory,
    }),
  );

  return {
    historyQuery,
  };
};


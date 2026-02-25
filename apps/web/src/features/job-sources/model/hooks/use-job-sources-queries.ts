'use client';

import { useQuery } from '@tanstack/react-query';

import { getJobSourceRunDiagnostics, listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useJobSourcesQueries = (token: string, selectedRunId: string | null) => {
  const runsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.runs(token),
      queryFn: listJobSourceRuns,
      refetchInterval: 15000,
    }),
  );

  const diagnosticsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['job-sources', 'run-diagnostics', token, selectedRunId],
      queryFn: (authToken) => getJobSourceRunDiagnostics(authToken, selectedRunId as string),
      enabled: Boolean(selectedRunId),
    }),
  );

  return {
    runsQuery,
    diagnosticsQuery,
  };
};


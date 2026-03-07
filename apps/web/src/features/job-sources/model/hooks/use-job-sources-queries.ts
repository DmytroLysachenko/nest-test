'use client';

import { useQuery } from '@tanstack/react-query';

import { getJobSourceRunDiagnostics, listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useJobSourcesQueries = (token: string, selectedRunId: string | null) => {
  const runsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.runs(token),
      queryFn: listJobSourceRuns,
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
      refetchInterval: (query) => {
        const runs = (query.state.data as Array<{ status: string }> | undefined) ?? [];
        const hasActiveRuns = runs.some((run) => run.status === 'PENDING' || run.status === 'RUNNING');
        return hasActiveRuns ? 10000 : false;
      },
    }),
  );

  const diagnosticsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['job-sources', 'run-diagnostics', token, selectedRunId],
      queryFn: (authToken) => getJobSourceRunDiagnostics(authToken, selectedRunId as string),
      enabled: Boolean(selectedRunId),
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  return {
    runsQuery,
    diagnosticsQuery,
  };
};

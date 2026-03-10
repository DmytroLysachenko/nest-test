'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getJobSourceRunDiagnostics,
  getScrapePreflight,
  getScrapeSchedule,
  listJobSourceRuns,
} from '@/features/job-sources/api/job-sources-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

type ScrapePreflightParams = {
  source?: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
  listingUrl?: string;
  limit?: number;
};

export const useJobSourcesQueries = (
  token: string,
  selectedRunId: string | null,
  preflightParams?: ScrapePreflightParams,
) => {
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
      enabled: diagnosticsEnabled && Boolean(selectedRunId),
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  const scheduleQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const preflightQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.preflight(token, preflightParams),
      queryFn: (authToken) => getScrapePreflight(authToken, preflightParams),
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  return {
    runsQuery,
    diagnosticsQuery,
    scheduleQuery,
    preflightQuery,
  };
};

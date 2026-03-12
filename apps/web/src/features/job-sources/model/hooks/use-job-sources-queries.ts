'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getJobSourceRunDiagnostics,
  getScrapePreflight,
  getScrapeSchedule,
  listJobSourceRuns,
} from '@/features/job-sources/api/job-sources-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { liveQueryPreset, mutableQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type {
  JobSourceRunDiagnosticsDto,
  JobSourceRunsListDto,
  ScrapePreflightDto,
  ScrapeScheduleDto,
} from '@/shared/types/api';

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
    buildAuthedQueryOptions<JobSourceRunsListDto>({
      token,
      queryKey: queryKeys.jobSources.runs(token),
      queryFn: listJobSourceRuns,
      ...liveQueryPreset(),
      refetchInterval: (query) => {
        const runs = (query.state.data as { items?: Array<{ status: string }> } | undefined)?.items ?? [];
        const hasActiveRuns = runs.some((run) => run.status === 'PENDING' || run.status === 'RUNNING');
        return hasActiveRuns ? 10_000 : false;
      },
    }),
  );

  const diagnosticsQuery = useQuery(
    buildAuthedQueryOptions<JobSourceRunDiagnosticsDto>({
      token,
      queryKey: ['job-sources', 'run-diagnostics', token, selectedRunId],
      queryFn: (authToken) => getJobSourceRunDiagnostics(authToken, selectedRunId as string),
      ...liveQueryPreset(),
      enabled: diagnosticsEnabled && Boolean(selectedRunId),
    }),
  );

  const scheduleQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleDto>({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      ...mutableQueryPreset(),
    }),
  );

  const preflightQuery = useQuery(
    buildAuthedQueryOptions<ScrapePreflightDto>({
      token,
      queryKey: queryKeys.jobSources.preflight(token, preflightParams),
      queryFn: (authToken) => getScrapePreflight(authToken, preflightParams),
      ...mutableQueryPreset(),
    }),
  );

  return {
    runsQuery,
    diagnosticsQuery,
    scheduleQuery,
    preflightQuery,
  };
};

'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getJobSourceRunDiagnostics,
  getJobSourceHealth,
  getScrapePreflight,
  getScrapeSchedule,
  getScrapeScheduleEvents,
  listJobSourceRuns,
} from '@/features/job-sources/api/job-sources-api';
import { env } from '@/shared/config/env';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { liveQueryPreset, mutableQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type {
  JobSourceRunDiagnosticsDto,
  JobSourceHealthDto,
  JobSourceRunsListDto,
  ScrapePreflightDto,
  ScrapeScheduleDto,
  ScrapeScheduleEventsDto,
} from '@/shared/types/api';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';
const ACTIVE_PLANNING_POLL_INTERVAL_MS = Math.max(env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS, 60_000);

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
        return hasActiveRuns ? ACTIVE_PLANNING_POLL_INTERVAL_MS : false;
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

  const scheduleEventsQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleEventsDto>({
      token,
      queryKey: queryKeys.jobSources.scheduleEvents(token, 12),
      queryFn: (authToken) => getScrapeScheduleEvents(authToken, 12),
      ...mutableQueryPreset(),
    }),
  );

  const sourceHealthQuery = useQuery(
    buildAuthedQueryOptions<JobSourceHealthDto>({
      token,
      queryKey: ['job-sources', 'source-health', token],
      queryFn: (authToken) => getJobSourceHealth(authToken, 72),
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
    sourceHealthQuery,
    scheduleQuery,
    scheduleEventsQuery,
    preflightQuery,
  };
};

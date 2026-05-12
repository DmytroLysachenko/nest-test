'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getScrapePreflight,
  getScrapeSchedule,
  getScrapeScheduleEvents,
} from '@/features/job-sources/api/job-sources-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { ScrapePreflightDto, ScrapeScheduleDto, ScrapeScheduleEventsDto } from '@/shared/types/api';

type ScrapePreflightParams = {
  source?: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
  listingUrl?: string;
  limit?: number;
};

const ACTIVE_SCHEDULE_POLL_INTERVAL_MS = 60_000;
const SCHEDULE_PROOF_WINDOW_MS = 90 * 60 * 1000;

const shouldPollSchedule = (schedule: ScrapeScheduleDto | undefined) => {
  if (!schedule?.enabled) {
    return false;
  }

  if (schedule.lastRunStatus === 'PENDING' || schedule.lastRunStatus === 'RUNNING') {
    return true;
  }

  const now = Date.now();
  const nextRunAtMs = schedule.nextRunAt ? new Date(schedule.nextRunAt).getTime() : null;
  const lastSuccessMs = schedule.lastSuccessfulScheduledAt
    ? new Date(schedule.lastSuccessfulScheduledAt).getTime()
    : null;

  if (typeof nextRunAtMs === 'number' && nextRunAtMs - now <= SCHEDULE_PROOF_WINDOW_MS) {
    return true;
  }

  if (typeof nextRunAtMs === 'number' && now > nextRunAtMs && (!lastSuccessMs || lastSuccessMs < nextRunAtMs)) {
    return true;
  }

  return !lastSuccessMs;
};

export const useJobSourcesQueries = (token: string, preflightParams?: ScrapePreflightParams) => {
  const scheduleEventsLimit = 6;
  const scheduleQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleDto>({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      ...mutableQueryPreset(),
      refetchInterval: (current) => {
        const schedule = current.state.data as ScrapeScheduleDto | undefined;
        return shouldPollSchedule(schedule) ? ACTIVE_SCHEDULE_POLL_INTERVAL_MS : false;
      },
    }),
  );

  const scheduleEventsQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleEventsDto>({
      token,
      queryKey: queryKeys.jobSources.scheduleEvents(token, scheduleEventsLimit),
      queryFn: (authToken) => getScrapeScheduleEvents(authToken, scheduleEventsLimit),
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
    scheduleQuery,
    scheduleEventsQuery,
    preflightQuery,
  };
};

'use client';

import { useQuery } from '@tanstack/react-query';

import { getNotebookSummary } from '@/features/job-offers/api/job-offers-api';
import { getScrapeSchedule } from '@/features/job-sources/api/job-sources-api';
import { env } from '@/shared/config/env';
import {
  normalizeNotebookSummary,
  normalizeScrapeSchedule,
} from '@/shared/lib/dashboard/private-dashboard-data-normalizers';
import { isRateLimitedError } from '@/shared/lib/http/rate-limit';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableQueryPreset, mutableRouteQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { JobOfferSummaryDto, ScrapeScheduleDto } from '@/shared/types/api';

const ACTIVE_DASHBOARD_POLL_INTERVAL_MS = Math.max(env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS, 60_000);
const SCHEDULE_TRUST_WINDOW_MS = 90 * 60 * 1000;

const shouldRefetchSchedule = (schedule: ScrapeScheduleDto | undefined) => {
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

  if (typeof nextRunAtMs === 'number' && nextRunAtMs - now <= SCHEDULE_TRUST_WINDOW_MS) {
    return true;
  }

  if (typeof nextRunAtMs === 'number' && now > nextRunAtMs && (!lastSuccessMs || lastSuccessMs < nextRunAtMs)) {
    return true;
  }

  return !lastSuccessMs;
};

export const usePrivateNotebookSummaryQuery = (token: string | null, initialData?: JobOfferSummaryDto | null) => {
  const query = useQuery(
    buildAuthedQueryOptions<JobOfferSummaryDto>({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      initialData: initialData ?? undefined,
      ...mutableRouteQueryPreset(),
    }),
  );

  return {
    ...query,
    data: normalizeNotebookSummary(query.data),
  };
};

export const usePrivateScrapeScheduleQuery = (token: string | null, initialData?: ScrapeScheduleDto | null) => {
  const query = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleDto>({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      initialData: initialData ?? undefined,
      ...mutableQueryPreset(),
      refetchInterval: (current) => {
        if (isRateLimitedError(current.state.error)) {
          return false;
        }
        const schedule = current.state.data as ScrapeScheduleDto | undefined;
        return shouldRefetchSchedule(schedule) ? ACTIVE_DASHBOARD_POLL_INTERVAL_MS : false;
      },
    }),
  );

  return {
    ...query,
    data: normalizeScrapeSchedule(query.data),
  };
};

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

export const useJobSourcesQueries = (token: string, preflightParams?: ScrapePreflightParams) => {
  const scheduleEventsLimit = 6;
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

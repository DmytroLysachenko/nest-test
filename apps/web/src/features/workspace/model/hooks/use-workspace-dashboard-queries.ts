'use client';

import { useQuery } from '@tanstack/react-query';

import { getJobOffersPreview, listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { JobOffersListDto } from '@/shared/types/api';

export const useWorkspaceDashboardQueries = (token: string | null) => {
  const offersQuery = useQuery(
    buildAuthedQueryOptions<JobOffersListDto, ReturnType<typeof getJobOffersPreview>>({
      token,
      queryKey: queryKeys.jobOffers.list(token, { limit: 8, offset: 0, mode: 'strict' }),
      queryFn: (authToken) => listJobOffers(authToken, { limit: 8, offset: 0, mode: 'strict' }),
      select: getJobOffersPreview,
      ...mutableQueryPreset(),
    }),
  );

  return {
    offersQuery,
  };
};

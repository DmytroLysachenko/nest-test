'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getJobOfferHistory, listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { ListJobOffersParams } from '@/features/job-offers/api/job-offers-api';

type UseNotebookQueriesArgs = {
  token: string;
  listParams: ListJobOffersParams;
  selectedId: string | null;
};

export const useNotebookQueries = ({ token, listParams, selectedId }: UseNotebookQueriesArgs) => {
  const listQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, listParams),
      queryFn: (authToken) => listJobOffers(authToken, listParams),
    }),
  );

  const selectedOffer = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [listQuery.data?.items, selectedId],
  );

  const historyQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.history(token, selectedOffer?.id ?? null),
      queryFn: (authToken) => getJobOfferHistory(authToken, selectedOffer!.id),
      enabled: Boolean(selectedOffer?.id),
    }),
  );

  return {
    listQuery,
    selectedOffer,
    historyQuery,
  };
};


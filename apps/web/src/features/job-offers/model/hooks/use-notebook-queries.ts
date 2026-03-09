'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getJobOfferHistory,
  getNotebookPreferences,
  getNotebookSummary,
  listJobOffers,
} from '@/features/job-offers/api/job-offers-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
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
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
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
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const preferencesQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.preferences(token),
      queryFn: getNotebookPreferences,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  return {
    listQuery,
    selectedOffer,
    historyQuery,
    preferencesQuery,
    summaryQuery,
  };
};

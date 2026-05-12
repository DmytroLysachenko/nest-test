'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getJobOfferActionPlan,
  getJobOfferHistory,
  getJobOfferPrepPacket,
  getJobOfferReminderPreview,
  getNotebookPreferences,
  getNotebookSummary,
  listJobOffers,
} from '@/features/job-offers/api/job-offers-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableRouteQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { ListJobOffersParams } from '@/features/job-offers/api/job-offers-api';
import type { JobOfferSummaryDto } from '@/shared/types/api';

type UseNotebookQueriesArgs = {
  token: string;
  listParams: ListJobOffersParams;
  pipelineParams: ListJobOffersParams;
  selectedId: string | null;
  sharedNotebookSummary?: JobOfferSummaryDto | null;
};

export const useNotebookQueries = ({
  token,
  listParams,
  pipelineParams,
  selectedId,
  sharedNotebookSummary,
}: UseNotebookQueriesArgs) => {
  const listQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, listParams),
      queryFn: (authToken) => listJobOffers(authToken, listParams),
      ...mutableRouteQueryPreset(),
    }),
  );

  const pipelineQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, pipelineParams),
      queryFn: (authToken) => listJobOffers(authToken, pipelineParams),
      ...mutableRouteQueryPreset(),
    }),
  );

  const selectedOffer = useMemo(
    () => pipelineQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [pipelineQuery.data?.items, selectedId],
  );

  const historyQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.history(token, selectedOffer?.id ?? null),
      queryFn: (authToken) => getJobOfferHistory(authToken, selectedOffer!.id),
      enabled: Boolean(selectedOffer?.id),
      ...mutableRouteQueryPreset(),
    }),
  );

  const preferencesQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.preferences(token),
      queryFn: getNotebookPreferences,
      ...mutableRouteQueryPreset(),
    }),
  );

  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      enabled: sharedNotebookSummary === undefined,
      ...mutableRouteQueryPreset(),
    }),
  );

  const actionPlanQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.actionPlan(token),
      queryFn: getJobOfferActionPlan,
      ...mutableRouteQueryPreset(),
    }),
  );

  const reminderPreviewQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.reminderPreview(token),
      queryFn: getJobOfferReminderPreview,
      ...mutableRouteQueryPreset(),
    }),
  );

  const prepPacketQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.prepPacket(token, selectedOffer?.id ?? null),
      queryFn: (authToken) => getJobOfferPrepPacket(authToken, selectedOffer!.id),
      enabled: Boolean(selectedOffer?.id),
      ...mutableRouteQueryPreset(),
    }),
  );

  return {
    listQuery,
    pipelineQuery,
    selectedOffer,
    historyQuery,
    preferencesQuery,
    actionPlanQuery,
    reminderPreviewQuery,
    prepPacketQuery,
    summaryQuery: {
      ...summaryQuery,
      data: sharedNotebookSummary ?? summaryQuery.data,
    },
  };
};

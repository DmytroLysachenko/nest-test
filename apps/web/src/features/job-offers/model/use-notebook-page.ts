'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getJobOfferHistory,
  listJobOffers,
  scoreJobOffer,
  updateJobOfferMeta,
  updateJobOfferStatus,
} from '@/features/job-offers/api/job-offers-api';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { useAppUiStore } from '@/shared/store/app-ui-store';

import type { JobOfferStatus } from '@/shared/types/api';

type UseNotebookPageArgs = {
  token: string;
};

export const useNotebookPage = ({ token }: UseNotebookPageArgs) => {
  const queryClient = useQueryClient();
  const selectedId = useAppUiStore((state) => state.notebook.selectedOfferId);
  const filters = useAppUiStore((state) => state.notebook.filters);
  const pagination = useAppUiStore((state) => state.notebook.pagination);
  const setNotebookSelectedOffer = useAppUiStore((state) => state.setNotebookSelectedOffer);
  const setNotebookFilter = useAppUiStore((state) => state.setNotebookFilter);
  const setNotebookOffset = useAppUiStore((state) => state.setNotebookOffset);

  const listParams = useMemo(
    () => ({
      limit: pagination.limit,
      offset: pagination.offset,
      status: filters.status === 'ALL' ? undefined : filters.status,
      search: filters.search || undefined,
      tag: filters.tag || undefined,
      hasScore: filters.hasScore === 'all' ? undefined : filters.hasScore === 'yes',
    }),
    [filters.hasScore, filters.search, filters.status, filters.tag, pagination.limit, pagination.offset],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.jobOffers.list(token, listParams),
    queryFn: () => listJobOffers(token, listParams),
  });

  const selectedOffer = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [listQuery.data?.items, selectedId],
  );

  const historyQuery = useQuery({
    queryKey: queryKeys.jobOffers.history(token, selectedOffer?.id ?? null),
    queryFn: () => getJobOfferHistory(token, selectedOffer!.id),
    enabled: Boolean(selectedOffer?.id),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobOfferStatus }) => updateJobOfferStatus(token, id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      await queryClient.invalidateQueries({ queryKey: ['job-offers', 'history', token] });
    },
  });

  const metaMutation = useMutation({
    mutationFn: ({ id, notes, tags }: { id: string; notes: string; tags: string[] }) =>
      updateJobOfferMeta(token, id, { notes, tags }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      await queryClient.invalidateQueries({ queryKey: ['job-offers', 'history', token] });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => scoreJobOffer(token, id, 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
    },
  });

  const canPrev = pagination.offset > 0;
  const canNext = (listQuery.data?.items.length ?? 0) === pagination.limit;

  return {
    listQuery,
    historyQuery,
    selectedOffer,
    selectedId,
    filters,
    pagination,
    canPrev,
    canNext,
    isBusy: statusMutation.isPending || metaMutation.isPending || scoreMutation.isPending,
    setNotebookSelectedOffer,
    setNotebookFilter,
    setNotebookOffset,
    updateStatus: statusMutation.mutate,
    updateMeta: metaMutation.mutate,
    rescore: scoreMutation.mutate,
  };
};

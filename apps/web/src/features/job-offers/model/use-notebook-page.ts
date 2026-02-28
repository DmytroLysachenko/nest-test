'use client';

import { useMemo } from 'react';

import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';
import { useNotebookQueries } from '@/features/job-offers/model/hooks/use-notebook-queries';
import { useAppUiStore } from '@/shared/store/app-ui-store';

import type { JobOfferStatus } from '@/shared/types/api';

type UseNotebookPageArgs = {
  token: string;
};

export const useNotebookPage = ({ token }: UseNotebookPageArgs) => {
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
      mode: filters.mode,
      search: filters.search || undefined,
      tag: filters.tag || undefined,
      hasScore: filters.hasScore === 'all' ? undefined : filters.hasScore === 'yes',
    }),
    [filters.hasScore, filters.mode, filters.search, filters.status, filters.tag, pagination.limit, pagination.offset],
  );

  const { listQuery, selectedOffer, historyQuery } = useNotebookQueries({
    token,
    listParams,
    selectedId,
  });
  const { statusMutation, metaMutation, scoreMutation, enqueueProfileScrapeMutation } = useNotebookMutations({ token });

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
    isBusy:
      statusMutation.isPending ||
      metaMutation.isPending ||
      scoreMutation.isPending ||
      enqueueProfileScrapeMutation.isPending,
    enqueueProfileScrapeMutation,
    setNotebookSelectedOffer,
    setNotebookFilter,
    setNotebookOffset,
    updateStatus: statusMutation.mutate,
    updateMeta: metaMutation.mutate,
    rescore: scoreMutation.mutate,
  };
};

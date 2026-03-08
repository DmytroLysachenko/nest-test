'use client';

import { useMemo } from 'react';

import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';
import { useNotebookQueries } from '@/features/job-offers/model/hooks/use-notebook-queries';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

type UseNotebookPageArgs = {
  token: string;
};

export const useNotebookPage = ({ token }: UseNotebookPageArgs) => {
  const selectedId = useAppUiStore((state) => state.notebook.selectedOfferId);
  const selectedOfferIds = useAppUiStore((state) => state.notebook.selectedOfferIds);
  const filters = useAppUiStore((state) => state.notebook.filters);
  const savedPreset = useAppUiStore((state) => state.notebook.savedPreset);
  const pagination = useAppUiStore((state) => state.notebook.pagination);
  const lastInteractionAt = useAppUiStore((state) => state.notebook.lastInteractionAt);
  const setNotebookSelectedOffer = useAppUiStore((state) => state.setNotebookSelectedOffer);
  const toggleNotebookSelectedOfferId = useAppUiStore((state) => state.toggleNotebookSelectedOfferId);
  const clearNotebookSelectedOfferIds = useAppUiStore((state) => state.clearNotebookSelectedOfferIds);
  const setNotebookSelectedOfferIds = useAppUiStore((state) => state.setNotebookSelectedOfferIds);
  const setNotebookFilter = useAppUiStore((state) => state.setNotebookFilter);
  const resetNotebookFilters = useAppUiStore((state) => state.resetNotebookFilters);
  const saveNotebookFilterPreset = useAppUiStore((state) => state.saveNotebookFilterPreset);
  const applyNotebookFilterPreset = useAppUiStore((state) => state.applyNotebookFilterPreset);
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

  const {
    statusMutation,
    bulkStatusMutation,
    metaMutation,
    feedbackMutation,
    pipelineMutation,
    scoreMutation,
    generatePrepMutation,
    enqueueProfileScrapeMutation,
  } = useNotebookMutations({ token });

  const canPrev = pagination.offset > 0;
  const canNext = (listQuery.data?.items.length ?? 0) === pagination.limit;
  const activeFilters = useMemo(
    () => [
      ...(filters.status !== 'ALL'
        ? [
            {
              key: 'status',
              label: `Status: ${filters.status}`,
              onClear: () => setNotebookFilter('status', 'ALL'),
            },
          ]
        : []),
      ...(filters.mode !== 'strict'
        ? [
            {
              key: 'mode',
              label: `Mode: ${filters.mode}`,
              onClear: () => setNotebookFilter('mode', 'strict'),
            },
          ]
        : []),
      ...(filters.hasScore !== 'all'
        ? [
            {
              key: 'hasScore',
              label: `Has score: ${filters.hasScore}`,
              onClear: () => setNotebookFilter('hasScore', 'all'),
            },
          ]
        : []),
      ...(filters.tag
        ? [
            {
              key: 'tag',
              label: `Tag: ${filters.tag}`,
              onClear: () => setNotebookFilter('tag', ''),
            },
          ]
        : []),
      ...(filters.search
        ? [
            {
              key: 'search',
              label: `Search: ${filters.search}`,
              onClear: () => setNotebookFilter('search', ''),
            },
          ]
        : []),
    ],
    [filters.hasScore, filters.mode, filters.search, filters.status, filters.tag, setNotebookFilter],
  );

  const listError = listQuery.isError ? toUserErrorMessage(listQuery.error, 'Failed to load notebook offers.') : null;
  const historyError = historyQuery.isError
    ? toUserErrorMessage(historyQuery.error, 'Failed to load offer history.')
    : null;
  const selectedVisibleIds = listQuery.data?.items.map((offer) => offer.id) ?? [];
  const isAllVisibleSelected =
    selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedOfferIds.includes(id));

  return {
    listQuery,
    historyQuery,
    listError,
    historyError,
    activeFilters,
    selectedOfferIds,
    selectedVisibleIds,
    isAllVisibleSelected,
    savedPreset,
    lastInteractionAt,
    selectedOffer,
    selectedId,
    filters,
    pagination,
    canPrev,
    canNext,
    isBusy:
      statusMutation.isPending ||
      bulkStatusMutation.isPending ||
      metaMutation.isPending ||
      scoreMutation.isPending ||
      feedbackMutation.isPending ||
      pipelineMutation.isPending ||
      generatePrepMutation.isPending ||
      enqueueProfileScrapeMutation.isPending,
    enqueueProfileScrapeMutation,
    setNotebookSelectedOffer,
    toggleNotebookSelectedOfferId,
    clearNotebookSelectedOfferIds,
    setNotebookSelectedOfferIds,
    setNotebookFilter,
    resetNotebookFilters,
    saveNotebookFilterPreset,
    applyNotebookFilterPreset,
    setNotebookOffset,
    updateStatus: statusMutation.mutate,
    updateStatusAsync: statusMutation.mutateAsync,
    bulkUpdateStatus: bulkStatusMutation.mutate,
    updateMeta: metaMutation.mutate,
    updateFeedback: feedbackMutation.mutate,
    updatePipeline: pipelineMutation.mutate,
    rescore: scoreMutation.mutate,
    generatePrep: generatePrepMutation.mutate,
    isGeneratingPrep: generatePrepMutation.isPending,
  };
};

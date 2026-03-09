'use client';

import { useEffect, useMemo, useRef } from 'react';

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
  const hydratedFromServer = useAppUiStore((state) => state.notebook.hydratedFromServer);
  const setNotebookSelectedOffer = useAppUiStore((state) => state.setNotebookSelectedOffer);
  const toggleNotebookSelectedOfferId = useAppUiStore((state) => state.toggleNotebookSelectedOfferId);
  const clearNotebookSelectedOfferIds = useAppUiStore((state) => state.clearNotebookSelectedOfferIds);
  const setNotebookSelectedOfferIds = useAppUiStore((state) => state.setNotebookSelectedOfferIds);
  const setNotebookFilter = useAppUiStore((state) => state.setNotebookFilter);
  const hydrateNotebookPreferences = useAppUiStore((state) => state.hydrateNotebookPreferences);
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
      followUp: filters.followUp === 'all' ? undefined : filters.followUp,
    }),
    [
      filters.followUp,
      filters.hasScore,
      filters.mode,
      filters.search,
      filters.status,
      filters.tag,
      pagination.limit,
      pagination.offset,
    ],
  );

  const { listQuery, selectedOffer, historyQuery, preferencesQuery, summaryQuery } = useNotebookQueries({
    token,
    listParams,
    selectedId,
  });

  const {
    statusMutation,
    bulkStatusMutation,
    dismissAllSeenMutation,
    autoArchiveMutation,
    metaMutation,
    feedbackMutation,
    pipelineMutation,
    scoreMutation,
    generatePrepMutation,
    enqueueProfileScrapeMutation,
    preferencesMutation,
  } = useNotebookMutations({ token });
  const lastPersistedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!preferencesQuery.data || hydratedFromServer) {
      return;
    }

    hydrateNotebookPreferences(preferencesQuery.data.filters, preferencesQuery.data.savedPreset);
    lastPersistedRef.current = JSON.stringify({
      filters: preferencesQuery.data.filters,
      savedPreset: preferencesQuery.data.savedPreset,
    });
  }, [preferencesQuery.data, hydratedFromServer, hydrateNotebookPreferences]);

  useEffect(() => {
    if (!hydratedFromServer) {
      return;
    }

    const nextPayload = JSON.stringify({ filters, savedPreset });
    if (lastPersistedRef.current === nextPayload) {
      return;
    }

    const timeout = window.setTimeout(() => {
      preferencesMutation.mutate({ filters, savedPreset });
      lastPersistedRef.current = nextPayload;
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [filters, hydratedFromServer, preferencesMutation, savedPreset]);

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
      ...(filters.followUp !== 'all'
        ? [
            {
              key: 'followUp',
              label: `Follow-up: ${filters.followUp}`,
              onClear: () => setNotebookFilter('followUp', 'all'),
            },
          ]
        : []),
    ],
    [filters.followUp, filters.hasScore, filters.mode, filters.search, filters.status, filters.tag, setNotebookFilter],
  );

  const listError = listQuery.isError ? toUserErrorMessage(listQuery.error, 'Failed to load notebook offers.') : null;
  const historyError = historyQuery.isError
    ? toUserErrorMessage(historyQuery.error, 'Failed to load offer history.')
    : null;
  const selectedVisibleIds = listQuery.data?.items.map((offer) => offer.id) ?? [];
  const isAllVisibleSelected =
    selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedOfferIds.includes(id));

  const applyQuickAction = (
    action: 'unscored' | 'strictTop' | 'saved' | 'applied' | 'followUpDue' | 'followUpUpcoming',
  ) => {
    setNotebookSelectedOffer(null);
    clearNotebookSelectedOfferIds();
    setNotebookFilter('search', '');
    setNotebookFilter('tag', '');
    setNotebookFilter('followUp', 'all');

    if (action === 'unscored') {
      setNotebookFilter('status', 'ALL');
      setNotebookFilter('mode', 'strict');
      setNotebookFilter('hasScore', 'no');
      return;
    }

    if (action === 'strictTop') {
      setNotebookFilter('status', 'ALL');
      setNotebookFilter('mode', 'strict');
      setNotebookFilter('hasScore', 'yes');
      return;
    }

    if (action === 'saved') {
      setNotebookFilter('status', 'SAVED');
      setNotebookFilter('mode', 'strict');
      setNotebookFilter('hasScore', 'all');
      return;
    }

    if (action === 'followUpDue') {
      setNotebookFilter('status', 'ALL');
      setNotebookFilter('mode', 'strict');
      setNotebookFilter('hasScore', 'all');
      setNotebookFilter('followUp', 'due');
      return;
    }

    if (action === 'followUpUpcoming') {
      setNotebookFilter('status', 'ALL');
      setNotebookFilter('mode', 'strict');
      setNotebookFilter('hasScore', 'all');
      setNotebookFilter('followUp', 'upcoming');
      return;
    }

    setNotebookFilter('status', 'APPLIED');
    setNotebookFilter('mode', 'strict');
    setNotebookFilter('hasScore', 'all');
  };

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
    preferencesQuery,
    summaryQuery,
    notebookSummary: summaryQuery.data,
    selectedOffer,
    selectedId,
    filters,
    pagination,
    canPrev,
    canNext,
    isBusy:
      statusMutation.isPending ||
      bulkStatusMutation.isPending ||
      dismissAllSeenMutation.isPending ||
      autoArchiveMutation.isPending ||
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
    applyQuickAction,
    updateStatus: statusMutation.mutate,
    updateStatusAsync: statusMutation.mutateAsync,
    bulkUpdateStatus: bulkStatusMutation.mutate,
    dismissAllSeen: dismissAllSeenMutation.mutate,
    autoArchive: autoArchiveMutation.mutate,
    updateMeta: metaMutation.mutate,
    updateFeedback: feedbackMutation.mutate,
    updatePipeline: pipelineMutation.mutate,
    rescore: scoreMutation.mutate,
    generatePrep: generatePrepMutation.mutate,
    isGeneratingPrep: generatePrepMutation.isPending,
    isPreferencesLoading: preferencesQuery.isLoading,
  };
};

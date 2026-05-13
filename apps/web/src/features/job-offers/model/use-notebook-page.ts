'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';
import { useNotebookQueries } from '@/features/job-offers/model/hooks/use-notebook-queries';
import {
  buildNotebookActiveFilters,
  notebookQuickActionFilters,
  toNotebookListParams,
} from '@/features/job-offers/model/utils/notebook-filter-utils';
import { usePrivateNotebookSummaryQuery } from '@/shared/lib/dashboard/private-dashboard-resource-queries';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

import type { NotebookQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';

type UseNotebookPageArgs = {
  token: string;
  initialQuickAction?: NotebookQuickActionKey | null;
  initialOfferId?: string | null;
};

const NOTEBOOK_PAGE_SIZE = 20;
const FULL_PIPELINE_LIMIT = 200;

export const useNotebookPage = ({ token, initialQuickAction = null, initialOfferId = null }: UseNotebookPageArgs) => {
  const notebookSummaryQuery = usePrivateNotebookSummaryQuery(token);
  const notebookSummary = notebookSummaryQuery.data;
  const filters = useAppUiStore((state) => state.notebook.filters);
  const savedPreset = useAppUiStore((state) => state.notebook.savedPreset);
  const hydratedFromServer = useAppUiStore((state) => state.notebook.hydratedFromServer);
  const setNotebookFilter = useAppUiStore((state) => state.setNotebookFilter);
  const hydrateNotebookPreferences = useAppUiStore((state) => state.hydrateNotebookPreferences);
  const resetNotebookFilters = useAppUiStore((state) => state.resetNotebookFilters);
  const saveNotebookFilterPreset = useAppUiStore((state) => state.saveNotebookFilterPreset);
  const applyNotebookFilterPreset = useAppUiStore((state) => state.applyNotebookFilterPreset);
  const [selectedId, setSelectedId] = useState<string | null>(initialOfferId);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>(initialOfferId ? [initialOfferId] : []);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const pagination = useMemo(
    () => ({
      offset: paginationOffset,
      limit: NOTEBOOK_PAGE_SIZE,
    }),
    [paginationOffset],
  );

  const listParams = useMemo(() => toNotebookListParams(filters, pagination), [filters, pagination]);
  const queueParams = useMemo(
    () => ({
      ...toNotebookListParams(filters, pagination),
      view: 'PIPELINE' as const,
    }),
    [filters, pagination],
  );
  const fullPipelineParams = useMemo(
    () => ({
      limit: FULL_PIPELINE_LIMIT,
      offset: 0,
      view: 'PIPELINE' as const,
    }),
    [],
  );

  const {
    listQuery,
    queueQuery,
    fullPipelineQuery,
    selectedOffer,
    historyQuery,
    preferencesQuery,
    summaryQuery,
    actionPlanQuery,
    reminderPreviewQuery,
    prepPacketQuery,
  } = useNotebookQueries({
    token,
    listParams,
    queueParams,
    fullPipelineParams,
    selectedId,
    sharedNotebookSummary: notebookSummary,
  });

  const {
    statusMutation,
    bulkStatusMutation,
    bulkFollowUpMutation,
    bulkWorkflowMutation,
    dismissAllSeenMutation,
    autoArchiveMutation,
    metaMutation,
    feedbackMutation,
    pipelineMutation,
    completeFollowUpMutation,
    snoozeFollowUpMutation,
    clearFollowUpMutation,
    scoreMutation,
    generatePrepMutation,
    enqueueProfileScrapeMutation,
    preferencesMutation,
  } = useNotebookMutations({ token });
  const lastPersistedRef = useRef<string | null>(null);
  const appliedRouteStateRef = useRef(false);

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
  const canNext = (queueQuery.data?.items.length ?? 0) === pagination.limit;
  const activeFilters = useMemo(
    () => buildNotebookActiveFilters(filters, setNotebookFilter),
    [filters, setNotebookFilter],
  );

  const listError = queueQuery.isError
    ? toUserErrorMessage(queueQuery.error, 'Failed to load notebook offers.', {
        byStatus: {
          401: 'Your session expired. Sign in again to keep working in the notebook.',
          403: 'You do not have access to this notebook yet.',
          429: 'Notebook data is being requested too aggressively right now. Wait a moment and retry.',
          500: 'Notebook data is temporarily unavailable. Try again shortly.',
        },
      })
    : null;
  const historyError = historyQuery.isError
    ? toUserErrorMessage(historyQuery.error, 'Failed to load offer history.', {
        byStatus: {
          429: 'Offer history is temporarily rate-limited. Retry in a moment.',
          500: 'Offer history is temporarily unavailable. Retry shortly.',
        },
      })
    : null;
  const selectedVisibleIds = queueQuery.data?.items.map((offer) => offer.id) ?? [];
  const isAllVisibleSelected =
    selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedOfferIds.includes(id));
  const setNotebookSelectedOffer = useCallback((offerId: string | null) => {
    setSelectedId(offerId);
    setSelectedOfferIds((current) => {
      if (!offerId) {
        return [];
      }
      return Array.from(new Set([...current, offerId]));
    });
  }, []);
  const toggleNotebookSelectedOfferId = useCallback((offerId: string) => {
    setSelectedOfferIds((current) => {
      if (current.includes(offerId)) {
        return current.filter((id) => id !== offerId);
      }
      return [...current, offerId];
    });
  }, []);
  const clearNotebookSelectedOfferIds = useCallback(() => {
    setSelectedOfferIds([]);
    setSelectedId(null);
  }, []);
  const setAllNotebookSelectedOfferIds = useCallback((ids: string[]) => {
    setSelectedOfferIds(Array.from(new Set(ids)));
  }, []);
  const setNotebookOffset = useCallback((offset: number) => {
    setPaginationOffset(Math.max(0, offset));
  }, []);
  const resetNotebookRouteState = useCallback(() => {
    setPaginationOffset(0);
    clearNotebookSelectedOfferIds();
  }, [clearNotebookSelectedOfferIds]);

  const applyQuickAction = useCallback(
    (action: NotebookQuickActionKey) => {
      const nextFilters = notebookQuickActionFilters[action];

      resetNotebookRouteState();
      setNotebookFilter('search', '');
      setNotebookFilter('tag', '');
      setNotebookFilter('status', nextFilters.status);
      setNotebookFilter('mode', nextFilters.mode);
      setNotebookFilter('hasScore', nextFilters.hasScore);
      setNotebookFilter('followUp', nextFilters.followUp);
      setNotebookFilter('attention', nextFilters.attention);
    },
    [resetNotebookRouteState, setNotebookFilter],
  );

  useEffect(() => {
    if (!hydratedFromServer || appliedRouteStateRef.current) {
      return;
    }

    appliedRouteStateRef.current = true;

    if (initialQuickAction) {
      applyQuickAction(initialQuickAction);
    }

    if (initialOfferId) {
      setNotebookSelectedOffer(initialOfferId);
    }
  }, [applyQuickAction, hydratedFromServer, initialOfferId, initialQuickAction, setNotebookSelectedOffer]);

  useEffect(() => {
    setPaginationOffset(0);
    setSelectedOfferIds([]);
  }, [filters]);

  useEffect(() => {
    if (!fullPipelineQuery.data?.items.length) {
      if (selectedId) {
        setSelectedId(null);
      }
      return;
    }

    const selectedStillVisible = fullPipelineQuery.data.items.some((offer) => offer.id === selectedId);
    if (!selectedStillVisible) {
      setSelectedId(fullPipelineQuery.data.items[0]?.id ?? null);
    }
  }, [fullPipelineQuery.data?.items, selectedId]);

  useEffect(() => {
    setSelectedOfferIds((current) => current.filter((id) => selectedVisibleIds.includes(id)));
  }, [selectedVisibleIds]);

  return {
    listQuery,
    queueQuery,
    fullPipelineQuery,
    historyQuery,
    listError,
    historyError,
    activeFilters,
    selectedOfferIds,
    selectedVisibleIds,
    isAllVisibleSelected,
    savedPreset,
    preferencesQuery,
    summaryQuery,
    sharedSummaryQuery: notebookSummaryQuery,
    notebookSummary: summaryQuery.data,
    actionPlan: actionPlanQuery.data,
    reminderPreview: reminderPreviewQuery.data,
    prepPacket: prepPacketQuery.data,
    selectedOffer,
    selectedId,
    filters,
    pagination,
    canPrev,
    canNext,
    isBusy:
      statusMutation.isPending ||
      bulkStatusMutation.isPending ||
      bulkFollowUpMutation.isPending ||
      bulkWorkflowMutation.isPending ||
      dismissAllSeenMutation.isPending ||
      autoArchiveMutation.isPending ||
      metaMutation.isPending ||
      scoreMutation.isPending ||
      feedbackMutation.isPending ||
      pipelineMutation.isPending ||
      completeFollowUpMutation.isPending ||
      snoozeFollowUpMutation.isPending ||
      clearFollowUpMutation.isPending ||
      generatePrepMutation.isPending ||
      enqueueProfileScrapeMutation.isPending,
    setNotebookSelectedOffer,
    toggleNotebookSelectedOfferId,
    clearNotebookSelectedOfferIds,
    setNotebookSelectedOfferIds: setAllNotebookSelectedOfferIds,
    setNotebookFilter,
    resetNotebookFilters: () => {
      resetNotebookRouteState();
      resetNotebookFilters();
    },
    saveNotebookFilterPreset,
    applyNotebookFilterPreset: () => {
      resetNotebookRouteState();
      applyNotebookFilterPreset();
    },
    setNotebookOffset,
    applyQuickAction,
    updateStatus: statusMutation.mutate,
    updateStatusAsync: statusMutation.mutateAsync,
    bulkUpdateStatus: bulkStatusMutation.mutate,
    bulkUpdateFollowUp: bulkFollowUpMutation.mutate,
    bulkUpdateWorkflow: bulkWorkflowMutation.mutate,
    dismissAllSeen: dismissAllSeenMutation.mutate,
    autoArchive: autoArchiveMutation.mutate,
    updateMeta: metaMutation.mutate,
    updateFeedback: feedbackMutation.mutate,
    updatePipeline: pipelineMutation.mutate,
    completeFollowUp: completeFollowUpMutation.mutate,
    snoozeFollowUp: snoozeFollowUpMutation.mutate,
    clearFollowUp: clearFollowUpMutation.mutate,
    rescore: scoreMutation.mutate,
    generatePrep: generatePrepMutation.mutate,
    isGeneratingPrep: generatePrepMutation.isPending,
    isPreferencesLoading: preferencesQuery.isLoading,
  };
};

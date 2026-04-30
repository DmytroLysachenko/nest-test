'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

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

export const useNotebookPage = ({ token, initialQuickAction = null, initialOfferId = null }: UseNotebookPageArgs) => {
  const notebookSummaryQuery = usePrivateNotebookSummaryQuery(token);
  const notebookSummary = notebookSummaryQuery.data;
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

  const listParams = useMemo(() => toNotebookListParams(filters, pagination), [filters, pagination]);

  const {
    listQuery,
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
  const canNext = (listQuery.data?.items.length ?? 0) === pagination.limit;
  const activeFilters = useMemo(
    () => buildNotebookActiveFilters(filters, setNotebookFilter),
    [filters, setNotebookFilter],
  );

  const listError = listQuery.isError
    ? toUserErrorMessage(listQuery.error, 'Failed to load notebook offers.', {
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
  const selectedVisibleIds = listQuery.data?.items.map((offer) => offer.id) ?? [];
  const isAllVisibleSelected =
    selectedVisibleIds.length > 0 && selectedVisibleIds.every((id) => selectedOfferIds.includes(id));

  const applyQuickAction = useCallback(
    (action: NotebookQuickActionKey) => {
      const nextFilters = notebookQuickActionFilters[action];

      setNotebookSelectedOffer(null);
      clearNotebookSelectedOfferIds();
      setNotebookFilter('search', '');
      setNotebookFilter('tag', '');
      setNotebookFilter('status', nextFilters.status);
      setNotebookFilter('mode', nextFilters.mode);
      setNotebookFilter('hasScore', nextFilters.hasScore);
      setNotebookFilter('followUp', nextFilters.followUp);
      setNotebookFilter('attention', nextFilters.attention);
    },
    [clearNotebookSelectedOfferIds, setNotebookFilter, setNotebookSelectedOffer],
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

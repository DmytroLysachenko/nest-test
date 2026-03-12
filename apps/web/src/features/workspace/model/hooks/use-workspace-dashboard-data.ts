'use client';

import { useEffect, useMemo } from 'react';

import { useWorkspaceDashboardMutations } from '@/features/workspace/model/hooks/use-workspace-dashboard-mutations';
import { useWorkspaceDashboardQueries } from '@/features/workspace/model/hooks/use-workspace-dashboard-queries';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

type UseWorkspaceDashboardDataArgs = {
  token: string | null;
  clearSession: () => void;
};

export const useWorkspaceDashboardData = ({ token, clearSession }: UseWorkspaceDashboardDataArgs) => {
  const {
    summary,
    notebookSummary,
    scrapeSchedule,
    refreshSummary,
    refreshNotebookSummary,
    refreshSchedule,
    isBootstrapping,
  } = usePrivateDashboardData();

  const { offersQuery, diagnosticsSummaryQuery, documentDiagnosticsSummaryQuery, focusQuery } =
    useWorkspaceDashboardQueries(token);
  const { logoutMutation } = useWorkspaceDashboardMutations({ token, clearSession });

  useEffect(() => {
    if (!token || isBootstrapping || !summary) {
      return;
    }
    if (summary.workflow.needsOnboarding) {
      window.location.replace('/onboarding');
    }
  }, [isBootstrapping, summary, token]);

  const isInitialLoading = !token || isBootstrapping || !summary || summary.workflow.needsOnboarding;
  const summaryError = null;
  const offersError = offersQuery.isError
    ? toUserErrorMessage(offersQuery.error, 'Unable to load recent offers.')
    : null;
  const diagnosticsError = diagnosticsSummaryQuery.isError
    ? toUserErrorMessage(diagnosticsSummaryQuery.error, 'Unable to load scrape diagnostics.')
    : null;
  const documentDiagnosticsError = documentDiagnosticsSummaryQuery.isError
    ? toUserErrorMessage(documentDiagnosticsSummaryQuery.error, 'Unable to load document diagnostics.')
    : null;

  return useMemo(
    () => ({
      summary,
      offers: offersQuery.data ?? [],
      diagnosticsSummary: diagnosticsSummaryQuery.data ?? null,
      documentDiagnosticsSummary: documentDiagnosticsSummaryQuery.data ?? null,
      notebookSummary,
      focusQueue: focusQuery.data ?? null,
      schedule: scrapeSchedule,
      isInitialLoading,
      summaryError,
      offersError,
      diagnosticsError,
      documentDiagnosticsError,
      isOffersLoading: offersQuery.isLoading,
      isDiagnosticsLoading: diagnosticsSummaryQuery.isLoading,
      isDocumentDiagnosticsLoading: documentDiagnosticsSummaryQuery.isLoading,
      isNotebookSummaryLoading: false,
      isScheduleLoading: false,
      isFocusLoading: focusQuery.isLoading,
      refetchSummary: refreshSummary,
      refetchOffers: offersQuery.refetch,
      refetchDiagnostics: diagnosticsSummaryQuery.refetch,
      refetchDocumentDiagnostics: documentDiagnosticsSummaryQuery.refetch,
      refetchNotebookSummary: refreshNotebookSummary,
      refetchFocusQueue: focusQuery.refetch,
      refetchSchedule: refreshSchedule,
      logout: logoutMutation.mutate,
      isLoggingOut: logoutMutation.isPending,
    }),
    [
      diagnosticsSummaryQuery.data,
      diagnosticsSummaryQuery.isLoading,
      diagnosticsSummaryQuery.refetch,
      documentDiagnosticsSummaryQuery.data,
      documentDiagnosticsSummaryQuery.isLoading,
      documentDiagnosticsSummaryQuery.refetch,
      notebookSummary,
      refreshNotebookSummary,
      refreshSchedule,
      refreshSummary,
      focusQuery.data,
      focusQuery.isLoading,
      focusQuery.refetch,
      diagnosticsError,
      documentDiagnosticsError,
      logoutMutation.isPending,
      logoutMutation.mutate,
      offersQuery.data,
      offersQuery.isLoading,
      offersQuery.refetch,
      offersError,
      isInitialLoading,
      scrapeSchedule,
      summaryError,
      summary,
    ],
  );
};

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useWorkspaceDashboardMutations } from '@/features/workspace/model/hooks/use-workspace-dashboard-mutations';
import { useWorkspaceDashboardQueries } from '@/features/workspace/model/hooks/use-workspace-dashboard-queries';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

type UseWorkspaceDashboardDataArgs = {
  token: string | null;
  clearSession: () => void;
};

export const useWorkspaceDashboardData = ({ token, clearSession }: UseWorkspaceDashboardDataArgs) => {
  const router = useRouter();

  const { summaryQuery, offersQuery, diagnosticsSummaryQuery, documentDiagnosticsSummaryQuery } =
    useWorkspaceDashboardQueries(token);
  const { logoutMutation } = useWorkspaceDashboardMutations({ token, clearSession });

  useEffect(() => {
    if (!token || summaryQuery.isLoading || !summaryQuery.data) {
      return;
    }
    if (summaryQuery.data.workflow.needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [router, summaryQuery.data, summaryQuery.isLoading, token]);

  const isInitialLoading = !token || summaryQuery.isLoading || !summaryQuery.data;
  const summaryError = summaryQuery.isError
    ? toUserErrorMessage(summaryQuery.error, 'Unable to load workspace summary.')
    : null;
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
      summary: summaryQuery.data ?? null,
      offers: offersQuery.data ?? [],
      diagnosticsSummary: diagnosticsSummaryQuery.data ?? null,
      documentDiagnosticsSummary: documentDiagnosticsSummaryQuery.data ?? null,
      isInitialLoading,
      summaryError,
      offersError,
      diagnosticsError,
      documentDiagnosticsError,
      isOffersLoading: offersQuery.isLoading,
      isDiagnosticsLoading: diagnosticsSummaryQuery.isLoading,
      isDocumentDiagnosticsLoading: documentDiagnosticsSummaryQuery.isLoading,
      refetchSummary: summaryQuery.refetch,
      refetchOffers: offersQuery.refetch,
      refetchDiagnostics: diagnosticsSummaryQuery.refetch,
      refetchDocumentDiagnostics: documentDiagnosticsSummaryQuery.refetch,
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
      diagnosticsError,
      documentDiagnosticsError,
      logoutMutation.isPending,
      logoutMutation.mutate,
      offersQuery.data,
      offersQuery.isLoading,
      offersQuery.refetch,
      offersError,
      isInitialLoading,
      summaryQuery.data,
      summaryQuery.refetch,
      summaryError,
    ],
  );
};

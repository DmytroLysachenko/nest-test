'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useWorkspaceDashboardMutations } from '@/features/workspace/model/hooks/use-workspace-dashboard-mutations';
import { useWorkspaceDashboardQueries } from '@/features/workspace/model/hooks/use-workspace-dashboard-queries';

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
      router.replace('/app/onboarding');
    }
  }, [router, summaryQuery.data, summaryQuery.isLoading, token]);

  const isLoading = !token || summaryQuery.isLoading || offersQuery.isLoading || !summaryQuery.data;

  return useMemo(
    () => ({
      summary: summaryQuery.data ?? null,
      offers: offersQuery.data ?? [],
      diagnosticsSummary: diagnosticsSummaryQuery.data ?? null,
      documentDiagnosticsSummary: documentDiagnosticsSummaryQuery.data ?? null,
      isLoading,
      logout: logoutMutation.mutate,
      isLoggingOut: logoutMutation.isPending,
    }),
    [
      diagnosticsSummaryQuery.data,
      documentDiagnosticsSummaryQuery.data,
      isLoading,
      logoutMutation.isPending,
      logoutMutation.mutate,
      offersQuery.data,
      summaryQuery.data,
    ],
  );
};

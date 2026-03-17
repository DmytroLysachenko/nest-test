'use client';

import { useEffect, useMemo } from 'react';

import { useWorkspaceDashboardQueries } from '@/features/workspace/model/hooks/use-workspace-dashboard-queries';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

type UseWorkspaceDashboardDataArgs = {
  token: string | null;
};

export const useWorkspaceDashboardData = ({ token }: UseWorkspaceDashboardDataArgs) => {
  const { summary, scrapeSchedule, refreshSummary, refreshSchedule, isBootstrapping, summaryError } =
    usePrivateDashboardData();
  const { offersQuery } = useWorkspaceDashboardQueries(token);

  useEffect(() => {
    if (!token || isBootstrapping || !summary) {
      return;
    }
    if (summary.workflow.needsOnboarding) {
      window.location.replace('/onboarding');
    }
  }, [isBootstrapping, summary, token]);

  const isInitialLoading =
    !token || isBootstrapping || (!summary && !summaryError) || summary?.workflow.needsOnboarding;
  const offersError = offersQuery.isError
    ? toUserErrorMessage(offersQuery.error, 'Unable to load recent offers.')
    : null;

  return useMemo(
    () => ({
      summary,
      offers: offersQuery.data ?? [],
      schedule: scrapeSchedule,
      isInitialLoading,
      summaryError,
      offersError,
      isOffersLoading: offersQuery.isLoading,
      isScheduleLoading: false,
      refetchSummary: refreshSummary,
      refetchOffers: offersQuery.refetch,
      refetchSchedule: refreshSchedule,
    }),
    [
      refreshSchedule,
      refreshSummary,
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

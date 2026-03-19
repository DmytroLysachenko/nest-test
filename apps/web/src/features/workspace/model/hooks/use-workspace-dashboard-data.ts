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
  const { offersQuery, focusQuery } = useWorkspaceDashboardQueries(token);

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
  const focusError = focusQuery.isError ? toUserErrorMessage(focusQuery.error, 'Unable to load focus queue.') : null;

  return useMemo(
    () => ({
      summary,
      offers: offersQuery.data ?? [],
      focusGroups: focusQuery.data?.groups ?? [],
      schedule: scrapeSchedule,
      isInitialLoading,
      summaryError,
      offersError,
      focusError,
      isOffersLoading: offersQuery.isLoading,
      isFocusLoading: focusQuery.isLoading,
      isScheduleLoading: false,
      refetchSummary: refreshSummary,
      refetchOffers: offersQuery.refetch,
      refetchFocus: focusQuery.refetch,
      refetchSchedule: refreshSchedule,
    }),
    [
      focusError,
      focusQuery.data,
      focusQuery.isLoading,
      focusQuery.refetch,
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

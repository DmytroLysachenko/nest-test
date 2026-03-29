'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getJobOfferActionPlan } from '@/features/job-offers/api/job-offers-api';
import { useWorkspaceDashboardQueries } from '@/features/workspace/model/hooks/use-workspace-dashboard-queries';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

type UseWorkspaceDashboardDataArgs = {
  token: string | null;
};

export const useWorkspaceDashboardData = ({ token }: UseWorkspaceDashboardDataArgs) => {
  const { summary, scrapeSchedule, refreshSummary, refreshSchedule, isBootstrapping, summaryError } =
    usePrivateDashboardData();
  const { offersQuery, focusQuery } = useWorkspaceDashboardQueries(token);
  const actionPlanQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.actionPlan(token),
      queryFn: getJobOfferActionPlan,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

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
    ? toUserErrorMessage(offersQuery.error, 'Unable to load recent offers.', {
        byStatus: {
          429: 'Recent offers are temporarily rate-limited. Retry in a moment.',
          500: 'Recent offers are temporarily unavailable. Retry shortly.',
        },
      })
    : null;
  const focusError = focusQuery.isError
    ? toUserErrorMessage(focusQuery.error, 'Unable to load focus queue.', {
        byStatus: {
          429: "Today's focus is loading too often right now. Retry in a moment.",
          500: "Today's focus is temporarily unavailable. Retry shortly.",
        },
      })
    : null;
  const actionPlanError = actionPlanQuery.isError
    ? toUserErrorMessage(actionPlanQuery.error, 'Unable to load the action plan.', {
        byStatus: {
          429: 'The action plan is being refreshed too often right now. Retry in a moment.',
          500: 'The action plan is temporarily unavailable. Retry shortly.',
        },
      })
    : null;

  return useMemo(
    () => ({
      summary,
      offers: offersQuery.data ?? [],
      focusGroups: focusQuery.data?.groups ?? [],
      actionPlan: actionPlanQuery.data?.buckets ?? [],
      schedule: scrapeSchedule,
      isInitialLoading,
      summaryError,
      offersError,
      focusError,
      actionPlanError,
      isOffersLoading: offersQuery.isLoading,
      isFocusLoading: focusQuery.isLoading,
      isActionPlanLoading: actionPlanQuery.isLoading,
      isScheduleLoading: false,
      refetchSummary: refreshSummary,
      refetchOffers: offersQuery.refetch,
      refetchFocus: focusQuery.refetch,
      refetchActionPlan: actionPlanQuery.refetch,
      refetchSchedule: refreshSchedule,
    }),
    [
      actionPlanError,
      actionPlanQuery.data,
      actionPlanQuery.isLoading,
      actionPlanQuery.refetch,
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

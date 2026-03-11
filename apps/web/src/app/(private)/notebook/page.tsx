'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import { PageLoadingState } from '@/shared/ui/async-states';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { WorkflowBlockedState } from '@/shared/ui/workflow-blocked-state';

const isNotebookQuickAction = (
  value: string | null,
): value is 'unscored' | 'strictTop' | 'saved' | 'applied' | 'staleUntriaged' | 'followUpDue' | 'followUpUpcoming' =>
  value === 'unscored' ||
  value === 'strictTop' ||
  value === 'saved' ||
  value === 'applied' ||
  value === 'staleUntriaged' ||
  value === 'followUpDue' ||
  value === 'followUpUpcoming';

export default function NotebookRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useRequireAuth();
  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.workflow.summary(auth.token),
      queryFn: getWorkspaceSummary,
      enabled: Boolean(auth.token),
    }),
  );

  if (!auth.token) {
    return <PageLoadingState title="Checking session" subtitle="Validating your JobSeeker access..." />;
  }

  if (summaryQuery.isLoading) {
    return (
      <PageLoadingState title="Checking notebook readiness" subtitle="Validating profile and scrape prerequisites..." />
    );
  }

  if (summaryQuery.data?.workflow.needsOnboarding) {
    const primaryBlocker =
      summaryQuery.data.blockerDetails?.find((blocker) => blocker.blockedRoutes.includes('notebook')) ??
      summaryQuery.data.blockerDetails?.[0];
    return (
      <WorkflowBlockedState
        title="Notebook is locked"
        description={primaryBlocker?.description ?? 'Complete onboarding to unlock notebook triage.'}
        actionLabel={primaryBlocker?.ctaLabel ?? 'Go to dashboard'}
        onAction={() => router.push(primaryBlocker?.href ?? '/')}
        breakdown={summaryQuery.data.readinessBreakdown}
      />
    );
  }

  const focusParam = searchParams.get('focus');
  const offerIdParam = searchParams.get('offerId');

  return (
    <NotebookPage
      token={auth.token}
      initialQuickAction={isNotebookQuickAction(focusParam) ? focusParam : null}
      initialOfferId={offerIdParam}
    />
  );
}

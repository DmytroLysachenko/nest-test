'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageLoadingState } from '@/shared/ui/async-states';
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
  const { summary, isBootstrapping } = usePrivateDashboardData();

  if (!auth.token) {
    return <PageLoadingState title="Checking session" subtitle="Validating your JobSeeker access..." />;
  }

  if (isBootstrapping || !summary) {
    return (
      <PageLoadingState title="Checking notebook readiness" subtitle="Validating profile and scrape prerequisites..." />
    );
  }

  if (summary.workflow.needsOnboarding) {
    const primaryBlocker =
      summary.blockerDetails?.find((blocker) => blocker.blockedRoutes.includes('notebook')) ??
      summary.blockerDetails?.[0];
    return (
      <WorkflowBlockedState
        title="Notebook is locked"
        description={primaryBlocker?.description ?? 'Complete onboarding to unlock notebook triage.'}
        actionLabel={primaryBlocker?.ctaLabel ?? 'Go to dashboard'}
        onAction={() => router.push(primaryBlocker?.href ?? '/')}
        breakdown={summary.readinessBreakdown}
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

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { isNotebookQuickActionKey } from '@/features/job-offers/model/utils/notebook-filter-utils';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

export default function NotebookRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useRequireAuth();
  const { summary, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Checking your notebook access"
        subtitle="Restoring your private session before the notebook opens."
      />
    );
  }

  if (isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Preparing notebook"
        subtitle="Loading your active pipeline, follow-up plan, and selected workspace."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Notebook unavailable"
        message={summaryError ?? 'Unable to load workspace summary.'}
        onRetry={() => {
          void refreshSummary();
        }}
      />
    );
  }

  if (summary.workflow.needsOnboarding) {
    return (
      <WorkflowRouteBlock
        summary={summary}
        route="notebook"
        title="Notebook is locked"
        fallbackDescription="Complete onboarding to unlock notebook triage."
        fallbackActionLabel="Go to dashboard"
        onNavigate={(href) => router.push(href)}
      />
    );
  }

  const focusParam = searchParams.get('focus');
  const offerIdParam = searchParams.get('offerId');

  return (
    <NotebookPage
      token={auth.token}
      initialQuickAction={isNotebookQuickActionKey(focusParam) ? focusParam : null}
      initialOfferId={offerIdParam}
      latestUpdateStatus={summary.scrape.lastRunStatus}
    />
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { OpportunitiesPage } from '@/features/job-offers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

const isDiscoveryQuickAction = (value: string | null): value is 'unscored' | 'strictTop' | 'staleUntriaged' =>
  value === 'unscored' || value === 'strictTop' || value === 'staleUntriaged';

export default function OpportunitiesRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useRequireAuth();
  const { summary, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Checking your opportunities access"
        subtitle="Restoring your private session before the discovery queue opens."
      />
    );
  }

  if (isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Preparing opportunities"
        subtitle="Validating profile readiness before loading the discovery review surface."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Opportunities unavailable"
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
        title="Opportunities are locked"
        fallbackDescription="Complete onboarding to unlock discovery and review."
        fallbackActionLabel="Go to dashboard"
        onNavigate={(href) => router.push(href)}
      />
    );
  }

  const focusParam = searchParams.get('focus');
  const offerIdParam = searchParams.get('offerId');

  return (
    <OpportunitiesPage
      token={auth.token}
      initialQuickAction={isDiscoveryQuickAction(focusParam) ? focusParam : null}
      initialOfferId={offerIdParam}
    />
  );
}

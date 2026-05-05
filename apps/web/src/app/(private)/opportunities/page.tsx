'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { OpportunitiesPage } from '@/features/job-offers';
import { isDiscoveryQuickActionKey } from '@/features/job-offers/model/utils/notebook-filter-utils';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

const toPageNumber = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const toPerPage = (value: string | null) => {
  const parsed = Number(value);
  return [10, 20, 30, 50].includes(parsed) ? parsed : 20;
};

const isReviewMode = (value: string | null): value is 'strict' | 'approx' | 'explore' =>
  value === 'strict' || value === 'approx' || value === 'explore';

const isHasScore = (value: string | null): value is 'all' | 'yes' | 'no' =>
  value === 'all' || value === 'yes' || value === 'no';

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
        subtitle="Loading your fresh review queue and discovery filters."
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
        route="opportunities"
        title="Opportunities are locked"
        fallbackDescription="Complete onboarding to unlock discovery and review."
        fallbackActionLabel="Go to dashboard"
        onNavigate={(href) => router.push(href)}
      />
    );
  }

  const focusParam = searchParams.get('focus');
  const offerIdParam = searchParams.get('offerId');
  const modeParam = searchParams.get('mode');
  const hasScoreParam = searchParams.get('hasScore');
  const searchParam = searchParams.get('search') ?? '';
  const tagParam = searchParams.get('tag') ?? '';
  const pageParam = searchParams.get('page');
  const perPageParam = searchParams.get('perPage');

  return (
    <OpportunitiesPage
      token={auth.token}
      initialQuickAction={isDiscoveryQuickActionKey(focusParam) ? focusParam : null}
      initialOfferId={offerIdParam}
      initialMode={isReviewMode(modeParam) ? modeParam : 'strict'}
      initialHasScore={isHasScore(hasScoreParam) ? hasScoreParam : 'all'}
      initialSearch={searchParam}
      initialTag={tagParam}
      initialPage={toPageNumber(pageParam)}
      initialPerPage={toPerPage(perPageParam)}
    />
  );
}

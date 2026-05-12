import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OpportunitiesRoute from '@/app/(private)/opportunities/page';

const mockOpportunitiesPage = vi.fn();
const mockRefreshSummary = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/auth/model/context/auth-context', () => ({
  useRequireAuth: () => ({
    token: 'token',
  }),
}));

vi.mock('@/shared/lib/dashboard/private-dashboard-data-context', () => ({
  usePrivateDashboardData: () => ({
    summary: {
      workflow: {
        needsOnboarding: false,
      },
    },
    isBootstrapping: false,
    summaryError: null,
    refreshSummary: mockRefreshSummary,
  }),
}));

vi.mock('@/features/job-offers', () => ({
  OpportunitiesPage: (props: unknown) => {
    mockOpportunitiesPage(props);
    return <div>Mock opportunities page</div>;
  },
}));

describe('OpportunitiesRoute', () => {
  beforeEach(() => {
    mockOpportunitiesPage.mockReset();
    mockRefreshSummary.mockReset();
    mockRouterPush.mockReset();
  });

  it('boots the opportunities page in approx mode when the route has no explicit mode', () => {
    render(<OpportunitiesRoute />);

    expect(screen.getByText('Mock opportunities page')).toBeInTheDocument();
    expect(mockOpportunitiesPage).toHaveBeenCalledTimes(1);
    expect(mockOpportunitiesPage.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        token: 'token',
        initialMode: 'approx',
      }),
    );
  });
});

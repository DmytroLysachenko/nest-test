import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/shared/ui/app-shell';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/dashboard/private-dashboard-data-context', () => ({
  usePrivateDashboardData: () => ({
    summary: {
      workflow: {
        needsOnboarding: false,
      },
      health: {
        readinessScore: 100,
      },
    },
  }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/notebook');
  });

  it('renders the compact workspace route nav when the sidebar is enabled', () => {
    render(
      <AppShell userEmail="tester@example.com" userRole="admin" onSignOut={vi.fn()}>
        <div>Workspace body</div>
      </AppShell>,
    );

    const compactNav = screen.getByLabelText('Workspace routes');

    expect(compactNav).toBeInTheDocument();
    expect(within(compactNav).getByRole('link', { name: /Notebook/i })).toBeInTheDocument();
    expect(within(compactNav).getByRole('link', { name: /Opportunities/i })).toBeInTheDocument();
    expect(within(compactNav).getByRole('link', { name: /Automation/i })).toBeInTheDocument();
  });
});

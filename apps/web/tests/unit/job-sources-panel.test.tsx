import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobSourcesPanel } from '@/features/job-sources/ui/job-sources-panel';
import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/features/job-sources/model/hooks/use-job-sources-panel', () => ({
  useJobSourcesPanel: vi.fn(),
}));

const mockedUseJobSourcesPanel = vi.mocked(useJobSourcesPanel);
type JobSourcesPanelState = ReturnType<typeof useJobSourcesPanel>;

const createPanelState = (overrides: Record<string, unknown> = {}) =>
  ({
    form: {
      register: vi.fn(() => ({})),
      formState: { errors: {} },
    },
    scheduleForm: {
      register: vi.fn(() => ({})),
      formState: { errors: {} },
    },
    preflightQuery: { data: null },
    scheduleResult: {
      enabled: true,
      cron: '0 9 * * *',
      timezone: 'Europe/Warsaw',
      source: 'pracuj-pl-it',
      limit: 20,
      careerProfileId: null,
      filters: null,
      lastTriggeredAt: null,
      nextRunAt: '2099-04-11T09:00:00.000Z',
      lastRunStatus: null,
      lastSuccessfulScheduledAt: null,
      lastSuccessfulScheduledRunId: null,
      lastFailedScheduledAt: null,
    },
    enqueueResult: null,
    recentRuns: [],
    mode: 'profile',
    isSubmitting: false,
    isSavingSchedule: false,
    isTriggeringSchedule: false,
    isRepairingCatalog: false,
    selectedRunId: null,
    setSelectedRunId: vi.fn(),
    submit: vi.fn(),
    submitSchedule: vi.fn((event?: Event) => event?.preventDefault?.()),
    triggerScheduleNow: vi.fn(),
    rematchNow: vi.fn(),
    applySchedulePreset: vi.fn(),
    ...overrides,
  }) as unknown as JobSourcesPanelState;

describe('JobSourcesPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows attention messaging when the last automatic update failed', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        scheduleResult: {
          enabled: true,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: null,
          filters: null,
          lastTriggeredAt: '2026-04-10T09:00:00.000Z',
          nextRunAt: '2026-04-11T09:00:00.000Z',
          lastRunStatus: 'FAILED',
          lastSuccessfulScheduledAt: null,
          lastSuccessfulScheduledRunId: null,
          lastFailedScheduledAt: '2026-04-10T09:02:00.000Z',
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('The last automatic update needs attention')).toBeInTheDocument();
    expect(screen.getByText(/did not finish cleanly/i)).toBeInTheDocument();
  });

  it('shows onboarding copy when automation has not run yet', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        scheduleResult: {
          enabled: true,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: null,
          filters: null,
          lastTriggeredAt: null,
          nextRunAt: '2026-04-11T09:00:00.000Z',
          lastRunStatus: null,
          lastSuccessfulScheduledAt: null,
          lastSuccessfulScheduledRunId: null,
          lastFailedScheduledAt: null,
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Automatic updates are on but not proven yet')).toBeInTheDocument();
  });

  it('shows due-window messaging when the next update window has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T10:00:00.000Z'));

    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        scheduleResult: {
          enabled: true,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: null,
          filters: null,
          lastTriggeredAt: '2026-04-10T09:00:00.000Z',
          nextRunAt: '2026-04-11T09:00:00.000Z',
          lastRunStatus: 'COMPLETED',
          lastSuccessfulScheduledAt: null,
          lastSuccessfulScheduledRunId: null,
          lastFailedScheduledAt: null,
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Next update window has passed')).toBeInTheDocument();
  });

  it('shows waiting-for-next-window messaging after a proven schedule success', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));

    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        scheduleResult: {
          enabled: true,
          cron: '0 9 * * *',
          timezone: 'Europe/Warsaw',
          source: 'pracuj-pl-it',
          limit: 20,
          careerProfileId: null,
          filters: null,
          lastTriggeredAt: '2026-04-10T09:00:00.000Z',
          nextRunAt: '2026-04-11T09:00:00.000Z',
          lastRunStatus: 'COMPLETED',
          lastSuccessfulScheduledAt: '2026-04-10T09:00:00.000Z',
          lastSuccessfulScheduledRunId: 'run-1',
          lastFailedScheduledAt: null,
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Automatic updates are working')).toBeInTheDocument();
  });

  it('exposes the catalog rebuild recovery action for empty-notebook incidents', () => {
    mockedUseJobSourcesPanel.mockReturnValue(createPanelState());

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Rebuild opportunities from recent catalog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild opportunities' })).toBeInTheDocument();
  });

  it('shows deferred linking evidence and repair CTA when a recent run needs notebook rebuild', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        recentRuns: [
          {
            id: 'run-1',
            source: 'PRACUJ_PL',
            userId: 'user-1',
            careerProfileId: 'profile-1',
            listingUrl: 'https://it.pracuj.pl/praca',
            filters: null,
            status: 'COMPLETED',
            totalFound: 20,
            scrapedCount: 12,
            error: null,
            startedAt: '2026-05-12T08:00:00.000Z',
            completedAt: '2026-05-12T08:10:00.000Z',
            finalizedAt: '2026-05-12T08:10:00.000Z',
            createdAt: '2026-05-12T08:00:00.000Z',
            matchingState: 'deferred',
            candidateOffers: 12,
            matchedOffers: 6,
            linkedNotebookOffers: 0,
          },
        ],
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Catalog saved, workflow rebuild needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repair deferred linking' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('shows delivered workflow evidence for a successful recent run', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        recentRuns: [
          {
            id: 'run-2',
            source: 'PRACUJ_PL',
            userId: 'user-1',
            careerProfileId: 'profile-1',
            listingUrl: 'https://it.pracuj.pl/praca',
            filters: null,
            status: 'COMPLETED',
            totalFound: 20,
            scrapedCount: 10,
            error: null,
            startedAt: '2026-05-12T08:00:00.000Z',
            completedAt: '2026-05-12T08:10:00.000Z',
            finalizedAt: '2026-05-12T08:10:00.000Z',
            createdAt: '2026-05-12T08:00:00.000Z',
            matchingState: 'completed',
            candidateOffers: 10,
            matchedOffers: 5,
            linkedNotebookOffers: 4,
          },
        ],
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Opportunities delivered')).toBeInTheDocument();
    expect(screen.getByText(/4 linked to your workflow/i)).toBeInTheDocument();
  });
});

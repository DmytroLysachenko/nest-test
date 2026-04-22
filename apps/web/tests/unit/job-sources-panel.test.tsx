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
    sourceHealthQuery: { data: { items: [] } },
    scheduleEventsQuery: { data: { items: [], total: 0 } },
    runsQuery: { data: { items: [] } },
    diagnosticsQuery: { data: null },
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
    },
    enqueueResult: null,
    mode: 'profile',
    isSubmitting: false,
    isSavingSchedule: false,
    isTriggeringSchedule: false,
    selectedRunId: null,
    setSelectedRunId: vi.fn(),
    submit: vi.fn(),
    submitSchedule: vi.fn((event?: Event) => event?.preventDefault?.()),
    triggerScheduleNow: vi.fn(),
    applySchedulePreset: vi.fn(),
    ...overrides,
  }) as unknown as JobSourcesPanelState;

describe('JobSourcesPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows source-health pause when automation is actively paused', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        sourceHealthQuery: {
          data: {
            items: [
              {
                activePause: true,
                guidance: 'Pause remains active until source health recovers.',
              },
            ],
          },
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Automatic updates are paused')).toBeInTheDocument();
    expect(screen.getAllByText('Pause remains active until source health recovers.').length).toBeGreaterThan(0);
  });

  it('shows recent schedule failure when the latest event is an error', () => {
    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        scheduleEventsQuery: {
          data: {
            total: 1,
            items: [
              {
                id: 'event-1',
                eventType: 'schedule_enqueue_failed',
                severity: 'error',
                code: 'source_paused',
                message: 'Scheduled enqueue failed because source automation is paused.',
                sourceRunId: null,
                requestId: 'req-1',
                meta: null,
                createdAt: '2026-04-10T10:00:00.000Z',
              },
            ],
          },
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Recent automatic update failed')).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled enqueue failed because source automation is paused.').length).toBeGreaterThan(
      0,
    );
  });

  it('shows due-but-paused messaging when source health blocks an overdue schedule', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T10:00:00.000Z'));

    mockedUseJobSourcesPanel.mockReturnValue(
      createPanelState({
        sourceHealthQuery: {
          data: {
            items: [
              {
                activePause: true,
                guidance: 'Pause remains active until source health recovers.',
              },
            ],
          },
        },
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
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('An update is due but paused')).toBeInTheDocument();
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
        },
        scheduleEventsQuery: {
          data: {
            total: 0,
            items: [],
          },
        },
      }),
    );

    render(<JobSourcesPanel token="token" />);

    expect(screen.getByText('Waiting for the next automatic update')).toBeInTheDocument();
  });
});

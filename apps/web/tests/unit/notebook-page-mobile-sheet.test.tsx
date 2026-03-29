import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookPage } from '@/features/job-offers/ui/notebook-page';

import type { JobOfferListItemDto, JobOfferSummaryDto, WorkspaceSummaryDto } from '@/shared/types/api';

vi.mock('@/features/job-offers/model/use-notebook-page', () => ({
  useNotebookPage: vi.fn(),
}));

const mockedUseNotebookPage = vi.mocked(useNotebookPage);

const offer: JobOfferListItemDto = {
  id: 'offer-1',
  jobOfferId: 'job-1',
  sourceRunId: 'run-12345678',
  status: 'NEW',
  matchScore: 0.91,
  rankingScore: 0.88,
  explanationTags: ['backend'],
  followUpState: 'none',
  matchMeta: {},
  aiFeedbackScore: null,
  aiFeedbackNotes: null,
  pipelineMeta: null,
  prepMaterials: null,
  notes: null,
  tags: null,
  statusHistory: null,
  lastStatusAt: null,
  source: 'PRACUJ_PL',
  url: 'https://example.com/job',
  title: 'Senior Backend Engineer',
  company: 'Example',
  location: 'Remote',
  salary: null,
  employmentType: null,
  description: 'Role description',
  requirements: null,
  details: null,
  createdAt: '2026-03-20T10:00:00.000Z',
};

const workspaceSummary: WorkspaceSummaryDto = {
  profile: { exists: true, status: 'READY', version: 1, updatedAt: null },
  profileInput: { exists: true, updatedAt: null },
  offers: {
    total: 1,
    scored: 1,
    saved: 0,
    applied: 0,
    interviewing: 0,
    offersMade: 0,
    rejected: 0,
    followUpDue: 0,
    lastUpdatedAt: null,
  },
  documents: { total: 1, ready: 1, pending: 0, failed: 0 },
  scrape: { lastRunStatus: 'COMPLETED', lastRunAt: null, lastRunProgress: null, totalRuns: 1 },
  workflow: { needsOnboarding: false },
  nextAction: {
    key: 'triage-notebook',
    title: 'Review your notebook',
    description: 'Use notebook and profile tools to keep the workspace moving.',
    href: '/notebook',
    priority: 'info',
  },
  activity: [],
  health: { readinessScore: 100, blockers: [], scrapeReliability: 'stable' },
  readinessBreakdown: [],
  blockerDetails: [],
  recommendedSequence: [],
};

const notebookSummary: JobOfferSummaryDto = {
  total: 1,
  scored: 1,
  unscored: 0,
  highConfidenceStrict: 1,
  staleUntriaged: 0,
  followUpDue: 0,
  followUpUpcoming: 0,
  buckets: [],
  topExplanationTags: [],
  quickActions: [],
};

describe('NotebookPage mobile sheet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('opens the selected offer inside the mobile workspace sheet', () => {
    mockedUseNotebookPage.mockReturnValue({
      listQuery: {
        isLoading: false,
        isError: false,
        data: { items: [offer], total: 1, hiddenByModeCount: 0, degradedResultCount: 0, mode: 'strict' },
        dataUpdatedAt: Date.now(),
        refetch: vi.fn(),
      },
      historyQuery: { data: undefined },
      listError: null,
      historyError: null,
      activeFilters: [],
      selectedOfferIds: [],
      selectedVisibleIds: [offer.id],
      isAllVisibleSelected: false,
      savedPreset: null,
      lastInteractionAt: null,
      preferencesQuery: { isLoading: false },
      summaryQuery: { data: notebookSummary },
      workspaceSummary,
      notebookSummary,
      selectedOffer: offer,
      selectedId: offer.id,
      filters: {
        status: 'ALL',
        mode: 'strict',
        view: 'LIST',
        search: '',
        tag: '',
        hasScore: 'all',
        followUp: 'all',
        attention: 'all',
      },
      pagination: { offset: 0, limit: 20 },
      canPrev: false,
      canNext: false,
      isBusy: false,
      enqueueProfileScrapeMutation: { mutate: vi.fn(), status: 'idle' },
      setNotebookSelectedOffer: vi.fn(),
      toggleNotebookSelectedOfferId: vi.fn(),
      clearNotebookSelectedOfferIds: vi.fn(),
      setNotebookSelectedOfferIds: vi.fn(),
      setNotebookFilter: vi.fn(),
      resetNotebookFilters: vi.fn(),
      saveNotebookFilterPreset: vi.fn(),
      applyNotebookFilterPreset: vi.fn(),
      setNotebookOffset: vi.fn(),
      applyQuickAction: vi.fn(),
      updateStatus: vi.fn(),
      updateStatusAsync: vi.fn(),
      bulkUpdateStatus: vi.fn(),
      bulkUpdateFollowUp: vi.fn(),
      dismissAllSeen: vi.fn(),
      autoArchive: vi.fn(),
      updateMeta: vi.fn(),
      updateFeedback: vi.fn(),
      updatePipeline: vi.fn(),
      rescore: vi.fn(),
      generatePrep: vi.fn(),
      isGeneratingPrep: false,
      isPreferencesLoading: false,
    } as unknown as ReturnType<typeof useNotebookPage>);

    render(<NotebookPage token="token" />);

    expect(screen.getAllByText('Senior Backend Engineer').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Keep the selected offer, fit context, and next action together without losing the notebook list.',
      ),
    ).toBeInTheDocument();
  });
});

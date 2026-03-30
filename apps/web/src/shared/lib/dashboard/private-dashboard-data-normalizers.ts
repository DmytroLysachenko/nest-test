import type { JobOfferSummaryDto, ScrapeScheduleDto, WorkspaceSummaryDto } from '@/shared/types/api';

export type PrivateDashboardNotebookSummary = JobOfferSummaryDto;
export type PrivateDashboardSchedule = ScrapeScheduleDto;
export type PrivateDashboardSummary = WorkspaceSummaryDto;

const defaultWorkspaceSummary: WorkspaceSummaryDto = {
  profile: {
    exists: false,
    status: null,
    version: null,
    updatedAt: null,
  },
  profileInput: {
    exists: false,
    updatedAt: null,
  },
  offers: {
    total: 0,
    scored: 0,
    saved: 0,
    applied: 0,
    interviewing: 0,
    offersMade: 0,
    rejected: 0,
    followUpDue: 0,
    lastUpdatedAt: null,
  },
  documents: {
    total: 0,
    ready: 0,
    pending: 0,
    failed: 0,
  },
  scrape: {
    lastRunStatus: null,
    lastRunAt: null,
    lastRunProgress: null,
    totalRuns: 0,
  },
  workflow: {
    needsOnboarding: true,
  },
  nextAction: {
    key: 'complete-setup',
    title: 'Complete setup',
    description: 'Finish onboarding and profile setup before you start using the private workspace.',
    href: '/onboarding',
    priority: 'critical',
  },
  activity: [],
  health: {
    readinessScore: 0,
    blockers: [],
    scrapeReliability: 'watch',
  },
  readinessBreakdown: [],
  blockerDetails: [],
  recommendedSequence: [],
};

const defaultNotebookSummary: JobOfferSummaryDto = {
  total: 0,
  scored: 0,
  unscored: 0,
  highConfidenceStrict: 0,
  staleUntriaged: 0,
  missingNextStep: 0,
  stalePipeline: 0,
  followUpDue: 0,
  followUpUpcoming: 0,
  buckets: [],
  topExplanationTags: [],
  quickActions: [],
};

const defaultScrapeSchedule: ScrapeScheduleDto = {
  enabled: false,
  cron: '0 9 * * *',
  timezone: 'Europe/Warsaw',
  source: 'pracuj-pl-it',
  limit: 20,
  careerProfileId: null,
  filters: null,
  lastTriggeredAt: null,
  nextRunAt: null,
  lastRunStatus: null,
};

export const normalizeWorkspaceSummary = (
  summary: WorkspaceSummaryDto | null | undefined,
): PrivateDashboardSummary | null => {
  if (!summary) {
    return null;
  }

  return {
    ...defaultWorkspaceSummary,
    ...summary,
    profile: {
      ...defaultWorkspaceSummary.profile,
      ...summary.profile,
    },
    profileInput: {
      ...defaultWorkspaceSummary.profileInput,
      ...summary.profileInput,
    },
    offers: {
      ...defaultWorkspaceSummary.offers,
      ...summary.offers,
    },
    documents: {
      ...defaultWorkspaceSummary.documents,
      ...summary.documents,
    },
    scrape: {
      ...defaultWorkspaceSummary.scrape,
      ...summary.scrape,
    },
    workflow: {
      ...defaultWorkspaceSummary.workflow,
      ...summary.workflow,
    },
    nextAction: {
      ...defaultWorkspaceSummary.nextAction,
      ...summary.nextAction,
    },
    activity: summary.activity ?? [],
    health: {
      ...defaultWorkspaceSummary.health,
      ...summary.health,
      blockers: summary.health?.blockers ?? [],
    },
    readinessBreakdown: summary.readinessBreakdown ?? [],
    blockerDetails: summary.blockerDetails ?? [],
    recommendedSequence: summary.recommendedSequence ?? [],
  };
};

export const normalizeNotebookSummary = (
  summary: JobOfferSummaryDto | null | undefined,
): PrivateDashboardNotebookSummary => ({
  ...defaultNotebookSummary,
  ...summary,
  buckets: summary?.buckets ?? [],
  topExplanationTags: summary?.topExplanationTags ?? [],
  quickActions: summary?.quickActions ?? [],
});

export const normalizeScrapeSchedule = (schedule: ScrapeScheduleDto | null | undefined): PrivateDashboardSchedule => ({
  ...defaultScrapeSchedule,
  ...schedule,
  filters: schedule?.filters ?? null,
  careerProfileId: schedule?.careerProfileId ?? null,
  lastTriggeredAt: schedule?.lastTriggeredAt ?? null,
  nextRunAt: schedule?.nextRunAt ?? null,
  lastRunStatus: schedule?.lastRunStatus ?? null,
});

import { describe, expect, it } from 'vitest';

import {
  normalizeNotebookSummary,
  normalizeScrapeSchedule,
  normalizeWorkspaceSummary,
} from '@/shared/lib/dashboard/private-dashboard-data-normalizers';

describe('private dashboard data normalizers', () => {
  it('fills optional notebook arrays with safe defaults', () => {
    const normalizedSummary = normalizeNotebookSummary({
      total: 4,
      scored: 1,
      unscored: 3,
      highConfidenceStrict: 0,
      staleUntriaged: 0,
      missingNextStep: 0,
      stalePipeline: 0,
      followUpDue: 0,
      followUpUpcoming: 0,
      buckets: undefined as never,
      topExplanationTags: undefined as never,
      quickActions: undefined as never,
    });

    expect(normalizedSummary.buckets).toEqual([]);
    expect(normalizedSummary.topExplanationTags).toEqual([]);
    expect(normalizedSummary.quickActions).toEqual([]);
  });

  it('returns a stable manual schedule when the server payload is missing', () => {
    const normalizedSchedule = normalizeScrapeSchedule(null);

    expect(normalizedSchedule.enabled).toBe(false);
    expect(normalizedSchedule.cron).toBe('0 9 * * *');
    expect(normalizedSchedule.lastRunStatus).toBeNull();
  });

  it('fills optional workspace arrays and nested blockers safely', () => {
    const normalizedSummary = normalizeWorkspaceSummary({
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
        key: 'setup',
        title: 'Setup',
        description: 'Complete setup',
        href: '/onboarding',
        priority: 'critical',
      },
      activity: undefined as never,
      health: {
        readinessScore: 0,
        blockers: undefined as never,
        scrapeReliability: 'watch',
      },
      readinessBreakdown: undefined as never,
      blockerDetails: undefined as never,
      recommendedSequence: undefined as never,
    });

    expect(normalizedSummary?.activity).toEqual([]);
    expect(normalizedSummary?.health.blockers).toEqual([]);
    expect(normalizedSummary?.readinessBreakdown).toEqual([]);
    expect(normalizedSummary?.blockerDetails).toEqual([]);
    expect(normalizedSummary?.recommendedSequence).toEqual([]);
  });
});

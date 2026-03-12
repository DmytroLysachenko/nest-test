import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import {
  careerProfilesTable,
  documentsTable,
  jobSourceRunsTable,
  profileInputsTable,
  userJobOffersTable,
} from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Drizzle } from '@/common/decorators';
import { resolveFollowUpState } from '@/features/job-offers/job-offer-follow-up';

import { WorkspaceSummaryCache } from './workspace-summary-cache';

import type { Env } from '@/config/env';

@Injectable()
export class WorkspaceService {
  private readonly cache: WorkspaceSummaryCache<any>;

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
  ) {
    const ttl = this.configService.get('WORKSPACE_SUMMARY_CACHE_TTL_SEC', { infer: true });
    this.cache = new WorkspaceSummaryCache(ttl);
  }

  async getSummary(userId: string) {
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }
    const summary = await this.computeSummary(userId);
    this.cache.set(userId, summary);
    return summary;
  }

  private async computeSummary(userId: string) {
    const [profileInput] = await this.db
      .select({
        id: profileInputsTable.id,
        updatedAt: profileInputsTable.updatedAt,
      })
      .from(profileInputsTable)
      .where(eq(profileInputsTable.userId, userId))
      .orderBy(desc(profileInputsTable.updatedAt))
      .limit(1);

    const [profile] = await this.db
      .select({
        id: careerProfilesTable.id,
        status: careerProfilesTable.status,
        version: careerProfilesTable.version,
        updatedAt: careerProfilesTable.updatedAt,
      })
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.updatedAt))
      .limit(1);

    const offersStatusCounts = await this.db
      .select({
        status: userJobOffersTable.status,
        count: count(),
      })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId))
      .groupBy(userJobOffersTable.status);

    const [offersScored] = await this.db
      .select({ value: count() })
      .from(userJobOffersTable)
      .where(and(eq(userJobOffersTable.userId, userId), isNotNull(userJobOffersTable.matchScore)));

    const [lastOffer] = await this.db
      .select({ updatedAt: userJobOffersTable.updatedAt })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId))
      .orderBy(desc(userJobOffersTable.updatedAt))
      .limit(1);

    const followUpOffers = await this.db
      .select({
        status: userJobOffersTable.status,
        pipelineMeta: userJobOffersTable.pipelineMeta,
      })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId));

    const documentStatusCounts = await this.db
      .select({
        status: documentsTable.extractionStatus,
        count: count(),
      })
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId))
      .groupBy(documentsTable.extractionStatus);

    const [runTotal] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.userId, userId));

    const [latestRun] = await this.db
      .select({
        status: jobSourceRunsTable.status,
        createdAt: jobSourceRunsTable.createdAt,
        progress: jobSourceRunsTable.progress,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.userId, userId))
      .orderBy(desc(jobSourceRunsTable.createdAt))
      .limit(1);

    const needsOnboarding = !profileInput || !profile || profile.status !== 'READY';
    const followUpDue = followUpOffers.filter(
      (offer) => resolveFollowUpState(offer.status, offer.pipelineMeta) === 'due',
    ).length;
    const failedDocuments = Number(documentStatusCounts.find((item) => item.status === 'FAILED')?.count ?? 0);

    const getCount = (status: string) => {
      const found = offersStatusCounts.find((c) => c.status === status);
      return Number(found?.count ?? 0);
    };

    const getDocumentCount = (status: string) =>
      Number(documentStatusCounts.find((item) => item.status === status)?.count ?? 0);

    const blockers = [
      ...(!profileInput ? ['profile-input-missing'] : []),
      ...(!profile || profile.status !== 'READY' ? ['career-profile-not-ready'] : []),
      ...(failedDocuments > 0 ? ['document-extraction-failed'] : []),
      ...(latestRun?.status === 'FAILED' ? ['scrape-failed'] : []),
      ...(Number(runTotal?.value ?? 0) === 0 ? ['scrape-not-started'] : []),
    ];
    const readinessScore = Math.max(0, 100 - blockers.length * 25);
    const scrapeReliability =
      latestRun?.status === 'FAILED'
        ? 'needs-attention'
        : latestRun?.status === 'RUNNING' || latestRun?.status === 'PENDING'
          ? 'watch'
          : 'stable';

    const nextAction = !profileInput
      ? {
          key: 'complete-profile-input',
          title: 'Complete profile targeting',
          description: 'Define desired roles and search preferences before generating a career profile.',
          href: '/onboarding',
          priority: 'critical' as const,
        }
      : failedDocuments > 0
        ? {
            key: 'retry-document-extraction',
            title: 'Recover failed document extraction',
            description: 'Retry failed document processing so the profile and matching inputs stay complete.',
            href: '/profile',
            priority: 'critical' as const,
          }
        : !profile || profile.status !== 'READY'
          ? {
              key: 'generate-career-profile',
              title: 'Generate a ready career profile',
              description: 'Refresh the active profile so matching and sourcing can use current data.',
              href: '/profile',
              priority: 'critical' as const,
            }
          : Number(runTotal?.value ?? 0) === 0
            ? {
                key: 'start-first-scrape',
                title: 'Run your first sourcing pass',
                description: 'Enqueue a scrape to populate the notebook with current opportunities.',
                href: '/notebook',
                priority: 'recommended' as const,
              }
            : latestRun?.status === 'FAILED'
              ? {
                  key: 'review-run-failure',
                  title: 'Review the latest scrape failure',
                  description: 'Inspect diagnostics and retry once the failure cause is clear.',
                  href: '/ops',
                  priority: 'recommended' as const,
                }
              : followUpDue > 0
                ? {
                    key: 'complete-follow-ups',
                    title: 'Complete due follow-ups',
                    description: 'Review saved and applied offers that have scheduled follow-up actions due now.',
                    href: '/notebook',
                    priority: 'recommended' as const,
                  }
                : {
                    key: 'triage-notebook',
                    title: 'Triage top notebook offers',
                    description: 'Work strict-mode results first, then save or advance promising leads.',
                    href: '/notebook',
                    priority: 'info' as const,
                  };

    const readinessBreakdown = [
      {
        key: 'profile-input',
        label: 'Profile input',
        ready: Boolean(profileInput),
        detail: profileInput ? 'Targeting and search intent saved.' : 'Save targeting preferences first.',
      },
      {
        key: 'career-profile',
        label: 'Career profile',
        ready: Boolean(profile && profile.status === 'READY'),
        detail:
          profile && profile.status === 'READY'
            ? 'Active career profile is ready.'
            : 'Generate or restore an active READY profile.',
      },
      {
        key: 'documents',
        label: 'Documents',
        ready: failedDocuments === 0,
        detail:
          failedDocuments > 0
            ? `${failedDocuments} document extraction failures need retry.`
            : getDocumentCount('READY') > 0
              ? 'Uploaded documents are available for profile generation.'
              : 'Upload CV or profile artifacts to improve profile quality.',
      },
      {
        key: 'scrape-run',
        label: 'Scrape run',
        ready: Boolean(latestRun && latestRun.status === 'COMPLETED'),
        detail:
          latestRun?.status === 'COMPLETED'
            ? 'At least one scrape run completed.'
            : latestRun?.status === 'FAILED'
              ? 'Latest scrape failed and needs review.'
              : 'Run scrape to populate notebook offers.',
      },
      {
        key: 'notebook-offers',
        label: 'Notebook offers',
        ready: offersStatusCounts.reduce((acc, curr) => acc + Number(curr.count), 0) > 0,
        detail:
          offersStatusCounts.reduce((acc, curr) => acc + Number(curr.count), 0) > 0
            ? 'Offers are ready for triage.'
            : 'No offers materialized yet.',
      },
    ];

    const blockerDetails = [
      ...(!profileInput
        ? [
            {
              key: 'profile-input-missing',
              severity: 'critical' as const,
              title: 'Profile targeting is missing',
              description:
                'Define desired roles and preferences so profile generation and scraping can use explicit intent.',
              href: '/onboarding',
              ctaLabel: 'Complete onboarding',
              blockedRoutes: ['dashboard', 'notebook'],
            },
          ]
        : []),
      ...(failedDocuments > 0
        ? [
            {
              key: 'document-extraction-failed',
              severity: 'critical' as const,
              title: 'Document extraction failed',
              description: 'One or more uploaded documents failed extraction and should be retried before continuing.',
              href: '/profile',
              ctaLabel: 'Retry document extraction',
              blockedRoutes: ['dashboard', 'notebook', 'profile'],
            },
          ]
        : []),
      ...(!profile || profile.status !== 'READY'
        ? [
            {
              key: 'career-profile-not-ready',
              severity: 'critical' as const,
              title: 'Career profile is not ready',
              description: 'Generate or restore a ready profile before attempting scrape and notebook workflows.',
              href: '/profile',
              ctaLabel: 'Open profile studio',
              blockedRoutes: ['dashboard', 'notebook'],
            },
          ]
        : []),
      ...(latestRun?.status === 'FAILED'
        ? [
            {
              key: 'scrape-failed',
              severity: 'warning' as const,
              title: 'Latest scrape run failed',
              description: 'Inspect diagnostics, review accepted filters, and retry once the failure cause is clear.',
              href: '/ops',
              ctaLabel: 'Review operations',
              blockedRoutes: ['dashboard', 'notebook'],
            },
          ]
        : []),
      ...(Number(runTotal?.value ?? 0) === 0
        ? [
            {
              key: 'scrape-not-started',
              severity: 'info' as const,
              title: 'No scrape run has completed yet',
              description: 'Run the first sourcing pass to materialize notebook offers and unlock triage.',
              href: '/notebook',
              ctaLabel: 'Open notebook',
              blockedRoutes: ['dashboard', 'notebook'],
            },
          ]
        : []),
    ];

    return {
      profile: {
        exists: Boolean(profile),
        status: profile?.status ?? null,
        version: profile?.version ?? null,
        updatedAt: profile?.updatedAt ?? null,
      },
      profileInput: {
        exists: Boolean(profileInput),
        updatedAt: profileInput?.updatedAt ?? null,
      },
      offers: {
        total: offersStatusCounts.reduce((acc, curr) => acc + Number(curr.count), 0),
        scored: Number(offersScored?.value ?? 0),
        saved: getCount('SAVED'),
        applied: getCount('APPLIED'),
        interviewing: getCount('INTERVIEWING'),
        offersMade: getCount('OFFER'),
        rejected: getCount('REJECTED'),
        followUpDue,
        lastUpdatedAt: lastOffer?.updatedAt ?? null,
      },
      documents: {
        total: documentStatusCounts.reduce((acc, curr) => acc + Number(curr.count), 0),
        ready: getDocumentCount('READY'),
        pending: getDocumentCount('PENDING'),
        failed: failedDocuments,
      },
      scrape: {
        lastRunStatus: latestRun?.status ?? null,
        lastRunAt: latestRun?.createdAt ?? null,
        lastRunProgress: (latestRun?.progress as Record<string, unknown> | null) ?? null,
        totalRuns: Number(runTotal?.value ?? 0),
      },
      workflow: {
        needsOnboarding,
      },
      nextAction,
      activity: [
        {
          key: 'profile',
          label: 'Profile updated',
          timestamp: profile?.updatedAt ?? null,
          tone: profile?.status === 'READY' ? 'success' : 'warning',
        },
        {
          key: 'offers',
          label: 'Offers last updated',
          timestamp: lastOffer?.updatedAt ?? null,
          tone: lastOffer?.updatedAt ? 'info' : 'neutral',
        },
        {
          key: 'scrape',
          label: 'Last scrape run',
          timestamp: latestRun?.createdAt ?? null,
          tone:
            latestRun?.status === 'COMPLETED'
              ? 'success'
              : latestRun?.status === 'FAILED'
                ? 'danger'
                : latestRun?.status
                  ? 'info'
                  : 'neutral',
        },
      ],
      health: {
        readinessScore,
        blockers,
        scrapeReliability,
      },
      readinessBreakdown,
      blockerDetails,
      recommendedSequence: ['profile-input', 'career-profile', 'scrape-run', 'notebook-offers'],
    };
  }
}

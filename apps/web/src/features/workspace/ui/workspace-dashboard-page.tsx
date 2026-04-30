'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { formatCountLabel, getAutomationLastUpdateSummary } from '@/shared/lib/presentation/job-search-ui';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EditorialPanel, HeroHeader, MetricCard, StatusPill, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowFeedback } from '@/shared/ui/workflow-feedback';

const WorkspaceRecentOffersPanel = dynamic(
  () =>
    import('@/features/workspace/ui/components/workspace-recent-offers-panel').then((module) => ({
      default: module.WorkspaceRecentOffersPanel,
    })),
  {
    loading: () => <div className="bg-surface-muted h-48 animate-pulse rounded-lg" />,
  },
);

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const dashboard = useWorkspaceDashboardData({ token: auth.token });

  if (dashboard.isInitialLoading) {
    return (
      <WorkspaceSplashState
        title="Opening workspace"
        subtitle="Restoring your current priorities, recent updates, and active application work."
      />
    );
  }

  if (dashboard.summaryError || !dashboard.summary) {
    return (
      <PageErrorState
        title="Workspace unavailable"
        message={dashboard.summaryError ?? 'Unable to load workspace summary.'}
        onRetry={() => {
          void dashboard.refetchSummary();
        }}
      />
    );
  }

  const summary = dashboard.summary;
  const offers = dashboard.offers;
  const nextAction = summary.nextAction ?? {
    title: 'Review new opportunities',
    description: 'Check new matches, keep the promising roles, and move only active work into the notebook.',
    href: '/opportunities',
  };
  const topFocus = dashboard.actionPlan.filter((bucket) => bucket.count > 0).slice(0, 3);
  const focusGroups = dashboard.focusGroups.filter((group) => group.count > 0).slice(0, 3);

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        title="Keep the search moving"
        subtitle="Use this page for direction only: what changed, what needs action next, and where to continue."
        meta={
          <>
            <span className="app-badge">{formatCountLabel(summary.offers.total, 'opportunity')}</span>
            <span className="app-badge">{formatCountLabel(summary.offers.followUpDue, 'follow-up')}</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={nextAction.href}>
              <Button>Continue</Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="secondary">Open opportunities</Button>
            </Link>
          </div>
        }
      />

      <section className="app-editorial-section items-start">
        <EditorialPanel
          title={nextAction.title}
          description={nextAction.description}
          className="bg-transparent p-0 shadow-none ring-0"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                value={getAutomationLastUpdateSummary(summary.scrape.lastRunStatus)}
                tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
              />
              <span className="text-text-soft text-sm">
                Last refresh {formatWorkspaceDateTime(summary.scrape.lastRunAt)}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/opportunities" className="app-inset-stack block">
                <p className="text-text-strong text-sm font-semibold">Opportunities</p>
                <p className="text-text-soft mt-1 text-sm">Review fresh roles and keep only the worthwhile ones.</p>
              </Link>
              <Link href="/notebook" className="app-inset-stack block">
                <p className="text-text-strong text-sm font-semibold">Notebook</p>
                <p className="text-text-soft mt-1 text-sm">
                  Keep active applications moving once a role is worth pursuing.
                </p>
              </Link>
              <Link href="/profile" className="app-inset-stack block">
                <p className="text-text-strong text-sm font-semibold">Profile</p>
                <p className="text-text-soft mt-1 text-sm">
                  Update source-of-truth details only when your target changes.
                </p>
              </Link>
            </div>
          </div>
        </EditorialPanel>

        <UtilityRail
          title="Current status"
          description="The few signals that matter before you start the next session."
          className="sticky top-4"
        >
          <div className="space-y-3">
            <div className="border-border/60 border-b pb-3">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Applications in motion</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{summary.offers.applied}</p>
            </div>
            <div className="border-border/60 border-b pb-3">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Due today</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{summary.offers.followUpDue}</p>
            </div>
            <div>
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Updates</p>
              <p className="text-text-strong mt-2 text-base font-semibold">
                {getWorkspaceRunStatusLabel(summary.scrape.lastRunStatus)}
              </p>
            </div>
          </div>
        </UtilityRail>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="New opportunities"
          value={String(summary.offers.total)}
          caption="Available for review"
          trend={{
            label: summary.offers.total > 0 ? 'Open opportunities' : 'No matches yet',
            tone: summary.offers.total > 0 ? 'info' : 'warning',
          }}
        />
        <MetricCard
          label="Active applications"
          value={String(summary.offers.applied)}
          caption="Roles already in motion"
          trend={{
            label:
              summary.offers.interviewing > 0 ? `${summary.offers.interviewing} interviewing` : 'No interviews yet',
            tone: summary.offers.interviewing > 0 ? 'success' : 'info',
          }}
        />
        <MetricCard
          label="Follow-ups due"
          value={String(summary.offers.followUpDue)}
          caption="Actions waiting in the notebook"
          trend={{
            label: summary.offers.followUpDue > 0 ? 'Start with notebook' : 'Nothing urgent',
            tone: summary.offers.followUpDue > 0 ? 'warning' : 'success',
          }}
        />
        <MetricCard
          label="Automation"
          value={getAutomationLastUpdateSummary(summary.scrape.lastRunStatus)}
          caption="Last update signal"
          trend={{
            label: summary.scrape.lastRunStatus === 'FAILED' ? 'Review automation' : 'Planning owns this control',
            tone: summary.scrape.lastRunStatus === 'FAILED' ? 'danger' : 'info',
          }}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Today" description="Open the highest-pressure work queue first, then leave this page.">
          {dashboard.isActionPlanLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-surface-muted h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : dashboard.actionPlanError ? (
            <WorkflowFeedback
              title="Today is temporarily unavailable"
              description={dashboard.actionPlanError}
              tone="danger"
              actionLabel="Retry"
              onAction={() => {
                void dashboard.refetchActionPlan();
              }}
            />
          ) : topFocus.length ? (
            <div className="space-y-3">
              {topFocus.map((bucket) => (
                <Link key={bucket.key} href={bucket.href} className="app-inset-stack block">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-text-strong text-sm font-semibold">{bucket.label}</p>
                    <span className="app-badge">{bucket.count}</span>
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{bucket.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Nothing urgent right now"
              description="No high-pressure notebook buckets are waiting at the moment."
            />
          )}
        </Card>

        <Card title="Keep momentum" description="Secondary routes to open after the highest-priority queue is clear.">
          {dashboard.isFocusLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-surface-muted h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : dashboard.focusError ? (
            <WorkflowFeedback
              title="Focus shortcuts are temporarily unavailable"
              description={dashboard.focusError}
              tone="danger"
              actionLabel="Retry"
              onAction={() => {
                void dashboard.refetchFocus();
              }}
            />
          ) : focusGroups.length ? (
            <div className="space-y-3">
              {focusGroups.map((group) => (
                <Link key={group.key} href={group.href} className="app-inset-stack block">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-text-strong text-sm font-semibold">{group.label}</p>
                    <span className="app-badge">{group.count}</span>
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{group.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No focus lanes are waiting"
              description="New reminders, fresh matches, and stale applications will appear here automatically."
            />
          )}
        </Card>
      </section>

      <WorkspaceRecentOffersPanel
        offers={offers}
        isLoading={dashboard.isOffersLoading}
        errorMessage={dashboard.offersError}
        onRetry={() => {
          void dashboard.refetchOffers();
        }}
      />
    </main>
  );
};

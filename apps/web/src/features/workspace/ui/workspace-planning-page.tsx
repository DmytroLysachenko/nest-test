'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import {
  getAutomationLastUpdateSummary,
  getAutomationModeLabel,
  getAutomationPresetSummary,
} from '@/shared/lib/presentation/job-search-ui';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { usePrivateScrapeScheduleQuery } from '@/shared/lib/dashboard/private-dashboard-resource-queries';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { HeroHeader, StatRow, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { WorkflowBlockedState } from '@/shared/ui/workflow-blocked-state';

const JobSourcesPanel = dynamic(
  () => import('@/features/job-sources').then((module) => ({ default: module.JobSourcesPanel })),
  {
    loading: () => <div className="bg-surface-muted/38 h-[28rem] animate-pulse rounded-[1.45rem]" />,
  },
);

export const WorkspacePlanningPage = () => {
  const auth = useRequireAuth();
  const router = useRouter();
  const { token, summary, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();
  const scrapeSchedule = usePrivateScrapeScheduleQuery(token).data;

  if (!auth.token || isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Opening automation"
        subtitle="Restoring your update timing, recent refresh status, and the controls that keep new roles coming in."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Automation unavailable"
        message={summaryError ?? 'Unable to load workspace summary.'}
        onRetry={() => {
          void refreshSummary();
        }}
      />
    );
  }

  if (summary.workflow.needsOnboarding) {
    const primaryBlocker =
      summary.blockerDetails?.find((blocker) => blocker.blockedRoutes.includes('planning')) ??
      summary.blockerDetails?.[0];

    return (
      <WorkflowBlockedState
        title="Automation unlocks after setup"
        description={primaryBlocker?.description ?? 'Complete onboarding before turning on automatic updates.'}
        actionLabel={primaryBlocker?.ctaLabel ?? 'Go to home'}
        onAction={() => {
          router.push(primaryBlocker?.href ?? '/');
        }}
        breakdown={summary.readinessBreakdown}
      />
    );
  }

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        title="Control when the search updates"
        subtitle="Use this page only for update timing, trust, and automation setup. Review and application work belong elsewhere."
        meta={
          <>
            <span className="app-badge">{getAutomationModeLabel(scrapeSchedule?.enabled)}</span>
            <span className="app-badge">
              Latest refresh{' '}
              {getAutomationLastUpdateSummary(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
            </span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/opportunities">
              <Button>Open opportunities</Button>
            </Link>
            <Link href="/notebook">
              <Button variant="secondary">Open notebook</Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Link href="/opportunities" className="app-inset-stack block">
          <p className="text-text-strong text-sm font-semibold">Review fresh roles</p>
          <p className="text-text-soft mt-1 text-sm">
            Jump back into first-pass triage once your update cadence is set.
          </p>
        </Link>
        <Link href="/notebook" className="app-inset-stack block">
          <p className="text-text-strong text-sm font-semibold">Move active roles forward</p>
          <p className="text-text-soft mt-1 text-sm">
            Continue follow-up, prep, and application work after automation is stable.
          </p>
        </Link>
        <Link href="/companies" className="app-inset-stack block">
          <p className="text-text-strong text-sm font-semibold">Research employers</p>
          <p className="text-text-soft mt-1 text-sm">
            Inspect companies separately from role triage when you need employer context.
          </p>
        </Link>
        <Link href="/profile" className="app-inset-stack block">
          <p className="text-text-strong text-sm font-semibold">Update targeting</p>
          <p className="text-text-soft mt-1 text-sm">
            Change profile inputs only when your real search direction has shifted.
          </p>
        </Link>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] 2xl:items-start">
        <JobSourcesPanel token={auth.token} />

        <div className="space-y-5 2xl:self-start">
          <UtilityRail title="Current automation" description="A plain-language view of your search update cadence.">
            <div className="space-y-3">
              <StatRow
                label="Update mode"
                value={getAutomationModeLabel(scrapeSchedule?.enabled)}
                tone={scrapeSchedule?.enabled ? 'success' : 'neutral'}
              />
              <StatRow
                label="Last update"
                value={getAutomationLastUpdateSummary(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
                tone={getWorkspaceRunStatusTone(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
              />
              <StatRow
                label="Cadence"
                value={getAutomationPresetSummary(scrapeSchedule?.cron, scrapeSchedule?.enabled)}
                tone={scrapeSchedule?.enabled ? 'info' : 'neutral'}
              />
              <StatRow label="Last refreshed at" value={formatWorkspaceDateTime(summary.scrape.lastRunAt)} />
              <StatRow label="Next refresh" value={formatWorkspaceDateTime(scrapeSchedule?.nextRunAt ?? null)} />
            </div>
          </UtilityRail>

          <section className="app-tonal-section space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-text-strong text-lg font-semibold tracking-[-0.02em]">Before you automate</h2>
              <p className="text-text-soft text-sm leading-6">
                Use this route as a timing control surface, not as a general workflow dashboard.
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="border-border/45 space-y-2 border-b pb-4">
                <p className="text-text-strong font-semibold">Keep your profile current</p>
                <p className="text-text-soft leading-6">
                  Update target role, skills, and documents only when your real job target changes.
                </p>
              </div>
              <div className="border-border/45 space-y-2 border-b pb-4">
                <p className="text-text-strong font-semibold">Use presets first</p>
                <p className="text-text-soft leading-6">
                  A morning or evening schedule is easier to trust than a fully custom setup.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-text-strong font-semibold">Leave this page once timing is set</p>
                <p className="text-text-soft leading-6">
                  Keep this page focused on update timing. Review fresh roles in Opportunities and manage active work in
                  Notebook.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
};

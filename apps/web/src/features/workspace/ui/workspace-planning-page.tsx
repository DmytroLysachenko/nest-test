'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { JobSourcesPanel } from '@/features/job-sources';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader, StatRow } from '@/shared/ui/dashboard-primitives';
import { WorkflowBlockedState } from '@/shared/ui/workflow-blocked-state';

export const WorkspacePlanningPage = () => {
  const auth = useRequireAuth();
  const router = useRouter();
  const { summary, scrapeSchedule, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();

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
      summary.blockerDetails?.find((blocker) => blocker.blockedRoutes.includes('notebook')) ??
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
        eyebrow="Automation"
        title="Control when the search updates"
        subtitle="Run an update now, turn recurring updates on, and keep your search preferences simple."
        meta={
          <>
            <span className="app-badge">{scrapeSchedule?.enabled ? 'Automatic updates on' : 'Manual updates'}</span>
            <span className="app-badge">
              Latest refresh {getWorkspaceRunStatusLabel(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <JobSourcesPanel token={auth.token} />

        <div className="space-y-4">
          <Card title="Current automation" description="A plain-language view of your search update cadence.">
            <div className="space-y-3">
              <StatRow
                label="Update mode"
                value={scrapeSchedule?.enabled ? 'Automatic' : 'Manual'}
                tone={scrapeSchedule?.enabled ? 'success' : 'neutral'}
              />
              <StatRow
                label="Latest refresh"
                value={getWorkspaceRunStatusLabel(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
                tone={getWorkspaceRunStatusTone(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
              />
              <StatRow label="Last updated" value={formatWorkspaceDateTime(summary.scrape.lastRunAt)} />
              <StatRow label="Next update" value={formatWorkspaceDateTime(scrapeSchedule?.nextRunAt ?? null)} />
            </div>
          </Card>

          <Card title="Before you automate" description="Keep the search predictable and avoid unnecessary noise.">
            <div className="space-y-3 text-sm">
              <div className="app-inset-stack">
                <p className="text-text-strong font-semibold">Keep your profile current</p>
                <p className="text-text-soft mt-2">
                  Update target role, skills, and documents only when your real job target changes.
                </p>
              </div>
              <div className="app-inset-stack">
                <p className="text-text-strong font-semibold">Use presets first</p>
                <p className="text-text-soft mt-2">
                  A morning or evening schedule is easier to trust than a fully custom setup.
                </p>
              </div>
              <div className="app-inset-stack">
                <p className="text-text-strong font-semibold">Review in opportunities, track in notebook</p>
                <p className="text-text-soft mt-2">
                  Keep this page focused on update timing. Actual job decisions belong in the workflow pages.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
};

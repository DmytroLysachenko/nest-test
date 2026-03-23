'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusTone,
  getWorkspaceRunStatusTrendTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import {
  DataTableShell,
  EditorialPanel,
  HeroHeader,
  MetricCard,
  StatRow,
  StatusPill,
  UtilityRail,
} from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';
import { GuidancePanel, JourneySteps } from '@/shared/ui/guidance-panels';
import { WorkflowRecoveryPanel } from '@/shared/ui/workflow-recovery-panel';

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const dashboard = useWorkspaceDashboardData({ token: auth.token });

  if (dashboard.isInitialLoading) {
    return (
      <WorkspaceSplashState
        title="Opening dashboard"
        subtitle="Restoring your overview, latest run state, and the cleanest next actions for this session."
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
  const schedule = dashboard.schedule;
  const nextAction = summary.nextAction ?? {
    key: 'triage-notebook',
    title: 'Review your notebook',
    description: 'Use notebook and profile tools to keep the workspace moving.',
    href: '/notebook',
    priority: 'info' as const,
  };
  const health = summary.health ?? {
    readinessScore: 0,
    blockers: [],
    scrapeReliability: 'watch' as const,
  };
  const latestRunStatus = summary.scrape.lastRunStatus ?? 'IDLE';
  const scrapeSetupHint =
    summary.scrape.totalRuns > 0
      ? 'You already have run history. Use Planning when you need to tune schedule or rerun a scrape deliberately.'
      : 'Start with Planning to run a first profile-driven scrape, then return here for overview and next actions.';

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Workspace Overview"
        title="JobSeeker Dashboard"
        subtitle="Keep this page as the clean overview: what changed, what needs action, and which surface you should open next."
        meta={
          <>
            <span className="app-badge">Signed in as {auth.user?.email ?? 'unknown user'}</span>
            <span className="app-badge">Offers: {summary.offers.total}</span>
            <span className="app-badge">Runs: {summary.scrape.totalRuns}</span>
            <span className="app-badge">Readiness: {health.readinessScore}%</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/planning">
              <Button variant="secondary">Open planning</Button>
            </Link>
            <Link href="/notebook">
              <Button>Open notebook</Button>
            </Link>
            <StatusPill value={latestRunStatus} tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)} />
          </div>
        }
      />

      <section className="app-editorial-section">
        <EditorialPanel
          eyebrow="What to do next"
          title={nextAction.title}
          description={nextAction.description}
          action={
            <Button
              type="button"
              onClick={() => {
                window.location.href = nextAction.href;
              }}
            >
              Open recommended flow
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/planning" className="app-glass-panel block p-4 transition-transform hover:-translate-y-0.5">
              <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Planning</p>
              <p className="text-text-strong mt-2 text-lg font-semibold">Run now or schedule</p>
              <p className="text-text-soft mt-2 text-sm leading-6">{scrapeSetupHint}</p>
            </Link>
            <Link href="/notebook" className="app-glass-panel block p-4 transition-transform hover:-translate-y-0.5">
              <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Notebook</p>
              <p className="text-text-strong mt-2 text-lg font-semibold">{summary.offers.followUpDue} follow-ups due</p>
              <p className="text-text-soft mt-2 text-sm leading-6">
                Triage due follow-ups and strict-top matches before opening broader discovery modes.
              </p>
            </Link>
            <Link href="/activity" className="app-glass-panel block p-4 transition-transform hover:-translate-y-0.5">
              <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Activity board</p>
              <p className="text-text-strong mt-2 text-lg font-semibold">{health.readinessScore}% readiness</p>
              <p className="text-text-soft mt-2 text-sm leading-6">
                Scan blockers, timeline updates, and quick-focus lanes without crowding the main dashboard.
              </p>
            </Link>
          </div>
        </EditorialPanel>

        <UtilityRail
          title="Overview rail"
          description="Keep the dashboard focused on direction, not every operational detail."
        >
          <div className="space-y-3">
            <div className="app-inset-stack">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Last run</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-text-strong text-base font-semibold">{latestRunStatus}</p>
                <StatusPill value={latestRunStatus} tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)} />
              </div>
            </div>
            <div className="app-inset-stack">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Primary blocker</p>
              <p className="text-text-strong mt-2 text-sm font-medium">
                {health.blockers.length ? health.blockers.join(', ') : 'Workspace unblocked'}
              </p>
            </div>
            <div className="app-inset-stack">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Operator note</p>
              <p className="text-text-soft mt-2 text-sm leading-6">
                Use Planning for deliberate sourcing changes. Use Notebook for triage. Keep this page for orientation.
              </p>
            </div>
          </div>
        </UtilityRail>
      </section>

      <div className="app-grid-cards">
        <MetricCard
          label="Profile Version"
          value={summary.profile.version == null ? 'n/a' : String(summary.profile.version)}
          caption={`Status: ${summary.profile.status ?? 'unknown'}`}
          trend={{
            label: summary.profile.exists ? 'Profile active' : 'Profile missing',
            tone: summary.profile.exists ? 'success' : 'warning',
          }}
        />
        <MetricCard
          label="Scrape Runs"
          value={String(summary.scrape.totalRuns)}
          caption={`Last run: ${summary.scrape.lastRunStatus ?? 'n/a'}`}
          trend={{
            label: summary.scrape.lastRunAt ? formatWorkspaceDateTime(summary.scrape.lastRunAt) : 'No run yet',
            tone: getWorkspaceRunStatusTrendTone(summary.scrape.lastRunStatus),
          }}
        />
        <MetricCard
          label="Pipeline Progress"
          value={String(summary.offers.applied)}
          caption="Active job applications"
          trend={{
            label: `${summary.offers.followUpDue} follow-ups due`,
            tone: summary.offers.followUpDue > 0 ? 'warning' : 'info',
          }}
        />
        <MetricCard
          label="Document Recovery"
          value={String(summary.documents.failed)}
          caption="Failed document extractions"
          trend={{
            label:
              summary.documents.failed > 0
                ? 'Retry failed document extraction'
                : `${summary.documents.ready} ready documents`,
            tone: summary.documents.failed > 0 ? 'danger' : 'success',
          }}
        />
        <MetricCard
          label="Total Leads"
          value={String(summary.offers.total)}
          caption={`Scored: ${summary.offers.scored}`}
          trend={{
            label: summary.offers.total > 0 ? 'Ready for triage' : 'No offers yet',
            tone: summary.offers.total > 0 ? 'info' : 'warning',
          }}
        />
        <MetricCard
          label="Readiness Score"
          value={`${health.readinessScore}%`}
          caption={`Next: ${nextAction.title}`}
          trend={{
            label: health.blockers.length ? health.blockers.join(', ') : 'Workspace unblocked',
            tone:
              health.scrapeReliability === 'stable'
                ? 'success'
                : health.scrapeReliability === 'watch'
                  ? 'warning'
                  : 'danger',
          }}
        />
      </div>

      <JourneySteps
        title="Smoothest daily flow"
        description="This is the shortest path from profile changes to fresh leads and controlled triage."
        steps={[
          {
            key: 'overview',
            title: 'Check overview',
            description:
              'Read the dashboard first so you know whether the next move belongs in planning, profile, or notebook.',
            status: 'done',
          },
          {
            key: 'planning',
            title: 'Tune sourcing in Planning',
            description: 'Run manually when you need fresh leads, then enable schedule once the targeting is stable.',
            status: latestRunStatus === 'RUNNING' || latestRunStatus === 'PENDING' ? 'active' : 'upcoming',
          },
          {
            key: 'triage',
            title: 'Finish in Notebook',
            description: 'Once the run is complete, handle strict-top matches and due follow-ups first.',
            status: summary.offers.total > 0 ? 'done' : 'upcoming',
          },
        ]}
      />

      <WorkflowRecoveryPanel blockers={summary.blockerDetails ?? []} />

      <section className="app-editorial-section">
        <EditorialPanel
          eyebrow="Funnel"
          title="Job Search Funnel"
          description="See where the search narrows from discovered leads into active opportunities."
        >
          <div className="space-y-4 pt-2">
            {[
              { label: 'Leads Found', value: summary.offers.total, color: 'bg-primary/20' },
              { label: 'AI Scored', value: summary.offers.scored, color: 'bg-primary/40' },
              { label: 'Saved for later', value: summary.offers.saved, color: 'bg-primary/60' },
              { label: 'Applied', value: summary.offers.applied, color: 'bg-primary/80' },
              { label: 'Interviewing', value: summary.offers.interviewing, color: 'bg-primary' },
              { label: 'Offers Received', value: summary.offers.offersMade, color: 'bg-app-success' },
            ].map((stage) => {
              const percentage = summary.offers.total > 0 ? (stage.value / summary.offers.total) * 100 : 0;
              return (
                <div key={stage.label} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-xs font-medium">
                    <span className="text-text-soft">{stage.label}</span>
                    <span className="text-text-strong">{stage.value}</span>
                  </div>
                  <div className="bg-surface-muted border-border/40 h-3 w-full overflow-hidden rounded-full border">
                    <div
                      className={`h-full transition-all duration-500 ease-out ${stage.color}`}
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </EditorialPanel>

        <UtilityRail
          title="Focus lane"
          description="Short operational blocks that tell you what deserves the next session."
        >
          <Card title="Today's Focus" description="Server-driven focus lanes for the next notebook session.">
            {dashboard.isFocusLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-surface-muted h-14 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : dashboard.focusError ? (
              <div className="border-app-danger-border bg-app-danger-soft space-y-2 rounded-xl border p-3">
                <p className="text-app-danger text-sm">{dashboard.focusError}</p>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9"
                  onClick={() => {
                    void dashboard.refetchFocus();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : dashboard.focusGroups.length ? (
              <div className="space-y-3">
                {dashboard.focusGroups
                  .filter((group) => group.count > 0)
                  .slice(0, 5)
                  .map((group) => (
                    <Link
                      key={group.key}
                      href={group.href}
                      className="app-muted-panel block transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-text-strong text-sm font-semibold">{group.label}</p>
                        <span className="app-badge">{group.count}</span>
                      </div>
                      <p className="text-text-soft mt-2 text-sm leading-6">{group.description}</p>
                    </Link>
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={<Inbox className="h-8 w-8" />}
                title="No focus lanes waiting"
                description="Your notebook does not have any urgent focus groups right now."
              />
            )}
          </Card>

          <Card title="Current Run Snapshot" description="A compact view of scrape and schedule state.">
            <div className="space-y-3">
              <StatRow
                label="Last scrape"
                value={latestRunStatus}
                tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
              />
              <StatRow label="Last run at" value={formatWorkspaceDateTime(summary.scrape.lastRunAt)} />
              <StatRow
                label="Automation"
                value={schedule?.enabled ? 'enabled' : 'manual'}
                tone={schedule?.enabled ? 'success' : 'neutral'}
              />
              <StatRow label="Next run" value={formatWorkspaceDateTime(schedule?.nextRunAt ?? null)} />
            </div>
          </Card>

          <Card
            title="Open the right surface"
            description="Use the page that matches the job-to-be-done instead of stacking every widget in one place."
          >
            <div className="space-y-3">
              {[
                {
                  href: '/planning',
                  title: 'Planning',
                  description: 'Schedule scraping, rerun searches, and review diagnostics.',
                },
                {
                  href: '/activity',
                  title: 'Activity Board',
                  description: 'Check readiness blockers, recent events, and next-session focus.',
                },
                {
                  href: '/profile',
                  title: 'Profile Studio',
                  description: 'Change source-of-truth inputs or regenerate the profile only when context changed.',
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="app-muted-panel block transition-transform hover:-translate-y-0.5"
                >
                  <p className="text-text-strong text-sm font-semibold">{item.title}</p>
                  <p className="text-text-soft mt-1 text-sm leading-6">{item.description}</p>
                </Link>
              ))}
            </div>
          </Card>
        </UtilityRail>
      </section>

      <DataTableShell title="Recent Offers" description="Quick preview of top offers from your notebook.">
        {dashboard.isOffersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-surface-muted h-10 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : dashboard.offersError ? (
          <div className="border-app-danger-border bg-app-danger-soft space-y-2 rounded-xl border p-3">
            <p className="text-app-danger text-sm">{dashboard.offersError}</p>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              onClick={() => {
                void dashboard.refetchOffers();
              }}
            >
              Retry
            </Button>
          </div>
        ) : offers.length ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-text-soft text-left">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Title</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Company</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Location</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-[0.12em]">Score</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="align-top">
                  <td className="py-3 pr-3">
                    <div className="app-inset-stack">
                      <p className="text-text-strong font-medium">{offer.title}</p>
                      <p className="text-text-soft mt-1 text-xs">Offer ID {offer.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="text-text-soft py-3 pr-3">{offer.company}</td>
                  <td className="text-text-soft py-3 pr-3">{offer.location ?? 'n/a'}</td>
                  <td className="py-3">
                    <StatusPill
                      value={offer.matchScore == null ? 'n/a' : offer.matchScore.toFixed(2)}
                      tone={offer.matchScore == null ? 'neutral' : offer.matchScore >= 0.7 ? 'success' : 'info'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No offers yet"
              description="Open Planning to enqueue a scrape, then return here once the first lead set lands."
            />
          </div>
        )}
      </DataTableShell>
    </main>
  );
};

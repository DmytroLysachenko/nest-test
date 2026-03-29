'use client';

import Link from 'next/link';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { formatWorkspaceDateTime, getWorkspaceRunStatusTone } from '@/features/workspace/model/workspace-page-helpers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader, StatRow, StatusPill, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel } from '@/shared/ui/guidance-panels';
import { WorkflowFeedback } from '@/shared/ui/workflow-feedback';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

export const WorkspaceActivityBoardPage = () => {
  const auth = useRequireAuth();
  const { summary, notebookSummary, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();

  if (!auth.token || isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Opening Activity Board"
        subtitle="Restoring readiness, follow-up pressure, and the signals that tell you what deserves attention next."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Activity board unavailable"
        message={summaryError ?? 'Unable to load workspace summary.'}
        onRetry={() => {
          void refreshSummary();
        }}
      />
    );
  }

  if (summary.workflow.needsOnboarding) {
    return (
      <WorkflowRouteBlock
        summary={summary}
        route="notebook"
        title="Activity board unlocks after setup"
        fallbackDescription="Complete onboarding before using activity tracking surfaces."
        fallbackActionLabel="Open dashboard"
        onNavigate={(href) => {
          window.location.assign(href);
        }}
      />
    );
  }

  const activity = summary.activity ?? [];

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Activity Board"
        title="Readiness, Focus & Timeline"
        subtitle="Use this board to understand what changed recently, what is blocked, and which bucket deserves your next notebook session."
        meta={
          <>
            <span className="app-badge">Readiness: {summary.health.readinessScore}%</span>
            <span className="app-badge">Follow-ups due: {summary.offers.followUpDue}</span>
            <span className="app-badge">Runs: {summary.scrape.totalRuns}</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/planning">
              <Button variant="secondary">Open planning</Button>
            </Link>
            <Link href="/notebook">
              <Button>Open notebook</Button>
            </Link>
          </div>
        }
      />

      <GuidancePanel
        eyebrow="How to use this board"
        title="Scan state first, then act"
        description="Check readiness blockers and activity timestamps here, then move into notebook triage or planning only after you know what changed."
        tone="success"
      />

      <section className="app-editorial-section">
        <div className="space-y-5">
          <Card title="Recent Activity" description="Key timestamps from workspace operations.">
            <div className="space-y-3 text-sm">
              {activity.length ? (
                activity.map((item) => (
                  <div key={item.key} className="app-inset-stack">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong font-semibold">{item.label}</p>
                      <StatusPill value={item.tone} tone={item.tone} />
                    </div>
                    <p className="text-text-soft mt-2">{formatWorkspaceDateTime(item.timestamp)}</p>
                  </div>
                ))
              ) : (
                <WorkflowFeedback
                  title="No recent activity yet"
                  description="Once you upload documents, generate a profile, or run sourcing, the latest workflow timestamps will appear here."
                  tone="info"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>

          <Card title="Readiness Breakdown" description="Server-driven stage health for setup and daily usage.">
            <div className="space-y-3">
              {summary.readinessBreakdown?.length ? (
                summary.readinessBreakdown.map((step) => (
                  <div key={step.key} className="app-inset-stack">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{step.label}</p>
                      <StatusPill value={step.ready ? 'ready' : 'blocked'} tone={step.ready ? 'success' : 'warning'} />
                    </div>
                    <p className="text-text-soft mt-2 text-sm leading-6">{step.detail}</p>
                  </div>
                ))
              ) : (
                <WorkflowFeedback
                  title="Readiness stages are temporarily unavailable"
                  description="The workspace summary loaded without the detailed readiness breakdown. Refresh the page if you need stage-by-stage detail."
                  tone="warning"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>
        </div>

        <UtilityRail
          title="Operational focus"
          description="Use the right rail for readiness, blockers, and next-session pressure."
        >
          <Card title="Pipeline Health" description="Current readiness of core stages and follow-up pressure.">
            <div className="space-y-3">
              <StatRow
                label="Profile input"
                value={summary.profileInput.exists ? 'ready' : 'missing'}
                tone={summary.profileInput.exists ? 'success' : 'warning'}
              />
              <StatRow
                label="Career profile"
                value={summary.profile.exists ? 'ready' : 'missing'}
                tone={summary.profile.exists ? 'success' : 'warning'}
              />
              <StatRow
                label="Last scrape"
                value={summary.scrape.lastRunStatus ?? 'IDLE'}
                tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
              />
              <StatRow
                label="Follow-up due"
                value={String(summary.offers.followUpDue)}
                tone={summary.offers.followUpDue > 0 ? 'warning' : 'success'}
              />
            </div>
          </Card>

          {notebookSummary ? (
            <Card title="Notebook Focus" description="Suggested buckets for the next triage session.">
              <div className="space-y-3">
                {notebookSummary.quickActions.map((item) => (
                  <Link key={item.key} href={item.href} className="block">
                    <StatRow
                      label={item.label}
                      value={String(item.count)}
                      tone={item.count > 0 ? 'warning' : 'success'}
                    />
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {summary.blockerDetails?.length ? (
            <Card title="Current Blockers" description="Direct links to unblock the most important workflow issues.">
              <div className="space-y-3">
                {summary.blockerDetails.map((blocker) => (
                  <div key={blocker.key} className="app-inset-stack space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{blocker.title}</p>
                      <StatusPill
                        value={blocker.severity}
                        tone={
                          blocker.severity === 'critical'
                            ? 'danger'
                            : blocker.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </div>
                    <p className="text-text-soft text-sm leading-6">{blocker.description}</p>
                    <Link href={blocker.href}>
                      <Button variant="secondary" className="h-9">
                        {blocker.ctaLabel}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card title="Next Session Targets" description="Quick links for the offers that should get attention first.">
            <div className="space-y-4">
              {notebookSummary?.quickActions.length ? (
                notebookSummary.quickActions
                  .filter((item) => item.count > 0)
                  .slice(0, 3)
                  .map((item) => (
                    <Link key={item.key} href={item.href} className="block">
                      <div className="app-inset-stack">
                        <p className="text-text-strong text-sm font-semibold">{item.label}</p>
                        <p className="text-text-soft mt-1 text-sm">{item.description}</p>
                        <p className="text-primary mt-3 text-xs font-semibold uppercase tracking-[0.16em]">
                          {item.count} items waiting
                        </p>
                      </div>
                    </Link>
                  ))
              ) : (
                <WorkflowFeedback
                  title="No focus groups are waiting right now"
                  description="Your notebook does not have a high-pressure bucket at the moment. New follow-ups or fresh offers will show up here automatically."
                  tone="info"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>
        </UtilityRail>
      </section>
    </main>
  );
};

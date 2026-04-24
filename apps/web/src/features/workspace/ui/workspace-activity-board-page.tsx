'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { usePrivateNotebookSummaryQuery } from '@/shared/lib/dashboard/private-dashboard-resource-queries';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader, StatRow, StatusPill } from '@/shared/ui/dashboard-primitives';
import { WorkflowFeedback } from '@/shared/ui/workflow-feedback';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

export const WorkspaceActivityBoardPage = () => {
  const auth = useRequireAuth();
  const router = useRouter();
  const { token, summary, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();
  const notebookSummary = usePrivateNotebookSummaryQuery(token).data;

  if (!auth.token || isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Opening progress"
        subtitle="Restoring recent changes, readiness, and the queues that deserve attention next."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Progress unavailable"
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
        title="Progress unlocks after setup"
        fallbackDescription="Finish setup before using the day-to-day tracking views."
        fallbackActionLabel="Go to home"
        onNavigate={(href) => {
          router.push(href);
        }}
      />
    );
  }

  const activity = summary.activity ?? [];
  const focusBuckets = notebookSummary?.quickActions.filter((item) => item.count > 0).slice(0, 4) ?? [];

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Progress"
        title="See what changed and what needs attention"
        subtitle="Use this view to check recent updates, readiness, and the next bucket worth opening."
        meta={
          <>
            <span className="app-badge">Readiness {summary.health.readinessScore}%</span>
            <span className="app-badge">{summary.offers.followUpDue} follow-ups due</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/notebook">
              <Button>Continue in notebook</Button>
            </Link>
            <Link href="/planning">
              <Button variant="secondary">Adjust automation</Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <Card
            title="Recent changes"
            description="The latest meaningful updates across setup, documents, and applications."
          >
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
                  title="Nothing has changed yet"
                  description="Recent updates will appear here once documents, profile work, or job activity starts moving."
                  tone="info"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>

          <Card title="Setup readiness" description="The core checks that keep the workspace working smoothly.">
            <div className="space-y-3">
              {summary.readinessBreakdown?.length ? (
                summary.readinessBreakdown.map((step) => (
                  <div key={step.key} className="app-inset-stack">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{step.label}</p>
                      <StatusPill
                        value={step.ready ? 'Ready' : 'Needs work'}
                        tone={step.ready ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="text-text-soft mt-2 text-sm leading-6">{step.detail}</p>
                  </div>
                ))
              ) : (
                <WorkflowFeedback
                  title="Readiness details are temporarily unavailable"
                  description="Refresh if you need the full setup breakdown."
                  tone="warning"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Current state" description="A compact summary before you choose the next page.">
            <div className="space-y-3">
              <StatRow
                label="Profile"
                value={summary.profile.exists ? 'Ready' : 'Needs work'}
                tone={summary.profile.exists ? 'success' : 'warning'}
              />
              <StatRow
                label="Documents"
                value={summary.documents.ready > 0 ? 'Ready' : 'Needs work'}
                tone={summary.documents.ready > 0 ? 'success' : 'warning'}
              />
              <StatRow
                label="Latest refresh"
                value={getWorkspaceRunStatusLabel(summary.scrape.lastRunStatus)}
                tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
              />
              <StatRow
                label="Follow-ups due"
                value={String(summary.offers.followUpDue)}
                tone={summary.offers.followUpDue > 0 ? 'warning' : 'success'}
              />
            </div>
          </Card>

          {summary.blockerDetails?.length ? (
            <Card title="Needs fixing" description="The blockers most likely to slow the workflow down.">
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

          <Card title="Open next" description="The highest-value queues for the next focused session.">
            <div className="space-y-3">
              {focusBuckets.length ? (
                focusBuckets.map((item) => (
                  <Link key={item.key} href={item.href} className="app-inset-stack block">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{item.label}</p>
                      <span className="app-badge">{item.count}</span>
                    </div>
                    <p className="text-text-soft mt-2 text-sm">{item.description}</p>
                  </Link>
                ))
              ) : (
                <WorkflowFeedback
                  title="No priority queues are waiting"
                  description="You can continue normally in opportunities or notebook."
                  tone="info"
                  className="p-4 sm:p-5"
                />
              )}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
};

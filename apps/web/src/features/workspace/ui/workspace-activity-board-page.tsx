'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import {
  formatWorkspaceDateTime,
  getWorkspaceRunStatusLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { getAutomationLastUpdateSummary } from '@/shared/lib/presentation/job-search-ui';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { usePrivateNotebookSummaryQuery } from '@/shared/lib/dashboard/private-dashboard-resource-queries';
import { PageErrorState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader, StatRow, StatusPill, UtilityRail } from '@/shared/ui/dashboard-primitives';
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
        subtitle="Restoring recent changes, momentum signals, and the next queue worth opening."
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
        route="activity"
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
        title="Track momentum over time"
        subtitle="Use this page to read the recent story of your search: what moved, what stalled, and which queue should carry the momentum forward."
        meta={
          <>
            <span className="app-badge">{summary.offers.applied} active applications</span>
            <span className="app-badge">{summary.offers.followUpDue} follow-ups due</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/notebook">
              <Button>Continue in notebook</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary">Back to home</Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-start">
        <div className="space-y-4">
          <Card
            title="Recent changes"
            description="The latest meaningful updates across profile setup, automatic updates, and active applications."
          >
            <div className="space-y-3 text-sm">
              {activity.length ? (
                activity.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="app-inset-stack">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong font-semibold">{item.label}</p>
                      <StatusPill value={item.tone} tone={item.tone} />
                    </div>
                    <p className="text-text-soft mt-2 text-sm">{formatWorkspaceDateTime(item.timestamp)}</p>
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

          <Card title="How to read this page" description="Progress is the historical view, not the command center.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="app-inset-stack">
                <p className="text-text-strong text-sm font-semibold">Use Home for direction</p>
                <p className="text-text-soft mt-2 text-sm">Go back home when you want the single best next move.</p>
              </div>
              <div className="app-inset-stack">
                <p className="text-text-strong text-sm font-semibold">Use Opportunities for review</p>
                <p className="text-text-soft mt-2 text-sm">
                  Fresh-role decisions still belong in the discovery workflow.
                </p>
              </div>
              <div className="app-inset-stack">
                <p className="text-text-strong text-sm font-semibold">Use Notebook for action</p>
                <p className="text-text-soft mt-2 text-sm">
                  Follow-ups, notes, and active applications belong in the notebook.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <UtilityRail
            title="Momentum now"
            description="Compact signals that explain whether the search is moving or waiting."
            className="app-surface-elevated p-5 md:p-6"
          >
            <div className="space-y-3">
              <StatRow
                label="Active applications"
                value={String(summary.offers.applied)}
                tone={summary.offers.applied > 0 ? 'success' : 'neutral'}
              />
              <StatRow
                label="Fresh opportunities"
                value={String(summary.offers.total)}
                tone={summary.offers.total > 0 ? 'info' : 'neutral'}
              />
              <StatRow
                label="Last update"
                value={getAutomationLastUpdateSummary(summary.scrape.lastRunStatus)}
                tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
              />
              <StatRow
                label="Follow-ups due"
                value={String(summary.offers.followUpDue)}
                tone={summary.offers.followUpDue > 0 ? 'warning' : 'success'}
              />
            </div>
          </UtilityRail>

          <Card
            title="Carry momentum forward"
            description="The next queue to open after you understand the recent changes."
          >
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
                  description="If nothing urgent is waiting, return home for direction or continue normally in notebook."
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

'use client';

import Link from 'next/link';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { JobSourcesPanel } from '@/features/job-sources';
import { useWorkspacePlanningQueries } from '@/features/workspace/model/hooks/use-workspace-planning-queries';
import {
  formatWorkspaceDateTime,
  getWorkspaceReliabilityLabel,
  getWorkspaceRunStatusTone,
} from '@/features/workspace/model/workspace-page-helpers';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { PageErrorState, SectionErrorState, SectionLoadingState, WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EditorialPanel, HeroHeader, StatRow, StatusPill, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel } from '@/shared/ui/guidance-panels';
import { WorkflowBlockedState } from '@/shared/ui/workflow-blocked-state';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

export const WorkspacePlanningPage = () => {
  const auth = useRequireAuth();
  const { summary, scrapeSchedule, isBootstrapping, summaryError, refreshSummary } = usePrivateDashboardData();
  const { diagnosticsSummaryQuery, documentDiagnosticsSummaryQuery } = useWorkspacePlanningQueries(auth.token);

  if (!auth.token || isBootstrapping) {
    return (
      <WorkspaceSplashState
        title="Opening Planning"
        subtitle="Restoring schedule state, run health, and the controls that keep new leads flowing."
      />
    );
  }

  if (summaryError || !summary) {
    return (
      <PageErrorState
        title="Planning unavailable"
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
        title="Planning unlocks after setup"
        description={primaryBlocker?.description ?? 'Complete onboarding before enabling ongoing sourcing.'}
        actionLabel={primaryBlocker?.ctaLabel ?? 'Open dashboard'}
        onAction={() => {
          window.location.href = primaryBlocker?.href ?? '/';
        }}
        breakdown={summary.readinessBreakdown}
      />
    );
  }

  const diagnostics = diagnosticsSummaryQuery.data ?? null;
  const documentDiagnostics = documentDiagnosticsSummaryQuery.data ?? null;
  const diagnosticsError = diagnosticsSummaryQuery.isError
    ? toUserErrorMessage(diagnosticsSummaryQuery.error, 'Unable to load scrape diagnostics.')
    : null;
  const documentDiagnosticsError = documentDiagnosticsSummaryQuery.isError
    ? toUserErrorMessage(documentDiagnosticsSummaryQuery.error, 'Unable to load document diagnostics.')
    : null;
  const reliability = diagnostics ? getWorkspaceReliabilityLabel(diagnostics.performance.successRate) : null;

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Planning"
        title="Automation & Sourcing"
        subtitle="Keep manual runs, recurring scrape cadence, and health diagnostics in one place instead of burying them inside the main dashboard."
        meta={
          <>
            <span className="app-badge">Schedule: {scrapeSchedule?.enabled ? 'Enabled' : 'Manual'}</span>
            <span className="app-badge">Last run: {summary.scrape.lastRunStatus ?? 'IDLE'}</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/activity">
              <Button variant="secondary">Open activity board</Button>
            </Link>
            <Link href="/notebook">
              <Button>Open notebook</Button>
            </Link>
          </div>
        }
      />

      <GuidancePanel
        eyebrow="Operator note"
        title="Use dashboard for overview, planning for execution"
        description="Manual runs, schedule tuning, and diagnostics live here so the rest of the workspace can stay calmer and more decisive."
        tone="info"
      />

      <section className="app-editorial-section">
        <div className="space-y-5">
          <JobSourcesPanel token={auth.token} />

          {diagnosticsEnabled && diagnosticsSummaryQuery.isLoading ? (
            <SectionLoadingState
              title="Scrape Diagnostics (72h)"
              description="Reliability and throughput of ingestion runs."
            />
          ) : diagnosticsEnabled && diagnosticsError ? (
            <SectionErrorState
              title="Scrape Diagnostics (72h)"
              message={diagnosticsError}
              onRetry={() => {
                void diagnosticsSummaryQuery.refetch();
              }}
            />
          ) : diagnosticsEnabled && diagnostics ? (
            <Card title="Scrape Diagnostics (72h)" description="Reliability and throughput of ingestion runs.">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-text-soft">Total runs: {diagnostics.status.total}</p>
                  <p className="text-text-soft">Completed: {diagnostics.status.completed}</p>
                  <p className="text-text-soft">Failed: {diagnostics.status.failed}</p>
                  <p className="text-text-strong font-semibold">
                    Success rate: {(diagnostics.performance.successRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-text-soft">
                    Avg duration:{' '}
                    {diagnostics.performance.avgDurationMs == null
                      ? 'n/a'
                      : `${diagnostics.performance.avgDurationMs} ms`}
                  </p>
                  <p className="text-text-soft">
                    P95 duration:{' '}
                    {diagnostics.performance.p95DurationMs == null
                      ? 'n/a'
                      : `${diagnostics.performance.p95DurationMs} ms`}
                  </p>
                  <p className="text-text-soft">Avg scraped: {diagnostics.performance.avgScrapedCount ?? 'n/a'}</p>
                </div>
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-app-warning">Timeout failures: {diagnostics.failures.timeout}</p>
                  <p className="text-app-danger">Network failures: {diagnostics.failures.network}</p>
                  <p className="text-app-danger">Validation failures: {diagnostics.failures.validation}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {diagnosticsEnabled && documentDiagnosticsSummaryQuery.isLoading ? (
            <SectionLoadingState
              title="Document Diagnostics"
              description="Upload and extraction stage timings from persisted metrics."
            />
          ) : diagnosticsEnabled && documentDiagnosticsError ? (
            <SectionErrorState
              title="Document Diagnostics"
              message={documentDiagnosticsError}
              onRetry={() => {
                void documentDiagnosticsSummaryQuery.refetch();
              }}
            />
          ) : diagnosticsEnabled && documentDiagnostics ? (
            <Card
              title={`Document Diagnostics (${documentDiagnostics.windowHours}h)`}
              description="Upload and extraction stage timings from persisted metrics."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-text-soft">Samples: {documentDiagnostics.totals.samples}</p>
                  <p className="text-text-soft">Documents: {documentDiagnostics.totals.documentsWithMetrics}</p>
                </div>
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-text-soft">
                    Upload confirm p95:{' '}
                    {documentDiagnostics.stages.UPLOAD_CONFIRM.p95DurationMs == null
                      ? 'n/a'
                      : `${documentDiagnostics.stages.UPLOAD_CONFIRM.p95DurationMs} ms`}
                  </p>
                  <p className="text-text-soft">
                    Extraction p95:{' '}
                    {documentDiagnostics.stages.EXTRACTION.p95DurationMs == null
                      ? 'n/a'
                      : `${documentDiagnostics.stages.EXTRACTION.p95DurationMs} ms`}
                  </p>
                </div>
                <div className="app-muted-panel space-y-2 text-sm">
                  <p className="text-app-success">
                    Pipeline success: {(documentDiagnostics.stages.TOTAL_PIPELINE.successRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-text-soft">
                    Pipeline avg:{' '}
                    {documentDiagnostics.stages.TOTAL_PIPELINE.avgDurationMs == null
                      ? 'n/a'
                      : `${documentDiagnostics.stages.TOTAL_PIPELINE.avgDurationMs} ms`}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <UtilityRail
          title="Execution rail"
          description="A compact operator view of schedule state, run health, and likely failure meaning."
        >
          <Card title="Automation Snapshot" description="Current schedule and scrape operating state.">
            <div className="space-y-3">
              <StatRow
                label="Schedule"
                value={scrapeSchedule?.enabled ? 'enabled' : 'manual'}
                tone={scrapeSchedule?.enabled ? 'success' : 'neutral'}
              />
              <StatRow label="Cron" value={scrapeSchedule?.cron ?? 'n/a'} />
              <StatRow label="Next run" value={formatWorkspaceDateTime(scrapeSchedule?.nextRunAt ?? null)} />
              <StatRow
                label="Last result"
                value={scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus ?? 'IDLE'}
                tone={getWorkspaceRunStatusTone(scrapeSchedule?.lastRunStatus ?? summary.scrape.lastRunStatus)}
              />
            </div>
          </Card>

          <Card title="Run Health" description="High-level reliability signals for the current sourcing setup.">
            <div className="space-y-3">
              <StatRow
                label="Current run"
                value={
                  <StatusPill
                    value={summary.scrape.lastRunStatus ?? 'IDLE'}
                    tone={getWorkspaceRunStatusTone(summary.scrape.lastRunStatus)}
                  />
                }
              />
              <StatRow label="Last run at" value={formatWorkspaceDateTime(summary.scrape.lastRunAt)} />
              <StatRow label="Total runs" value={String(summary.scrape.totalRuns)} />
              {reliability ? <StatRow label="Reliability" value={reliability.label} tone={reliability.tone} /> : null}
            </div>
          </Card>

          <Card title="Failure Guide" description="What the most common scrape failures usually mean.">
            <div className="space-y-3">
              {[
                ['Timeout', 'Source page too slow or overloaded. Lower the batch size or retry later.'],
                ['Network', 'Temporary upstream issue. Retry when the source stabilizes.'],
                ['Validation', 'Scraped payload shape changed and needs investigation.'],
                ['Callback', 'Worker finished but result application failed on the API side.'],
              ].map(([label, description]) => (
                <div key={label} className="app-inset-stack">
                  <p className="text-text-strong text-sm font-semibold">{label}</p>
                  <p className="text-text-soft mt-1 text-sm leading-6">{description}</p>
                </div>
              ))}
            </div>
          </Card>
        </UtilityRail>
      </section>
    </main>
  );
};

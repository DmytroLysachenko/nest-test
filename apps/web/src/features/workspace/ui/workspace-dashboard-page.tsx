'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import { PageErrorState, PageLoadingState, SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { DataTableShell, MetricCard, SectionHeader, StatusPill } from '@/shared/ui/dashboard-primitives';
import { Card } from '@/shared/ui/card';

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'n/a';
  }

  return new Date(value).toLocaleString();
};

const getRunStatusTone = (status: string | null): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (!status) {
    return 'neutral';
  }
  if (status === 'COMPLETED') {
    return 'success';
  }
  if (status === 'FAILED') {
    return 'danger';
  }
  if (status === 'RUNNING' || status === 'PENDING') {
    return 'info';
  }
  return 'warning';
};

const getRunStatusTrendTone = (status: string | null): 'success' | 'warning' | 'danger' | 'info' => {
  const tone = getRunStatusTone(status);
  return tone === 'neutral' ? 'warning' : tone;
};

const getReliabilityLabel = (successRate: number | undefined) => {
  if (successRate == null) {
    return {
      label: 'Unknown reliability',
      tone: 'neutral' as const,
    };
  }
  if (successRate >= 0.9) {
    return {
      label: 'Stable',
      tone: 'success' as const,
    };
  }
  if (successRate >= 0.75) {
    return {
      label: 'Watch closely',
      tone: 'warning' as const,
    };
  }
  return {
    label: 'Needs attention',
    tone: 'danger' as const,
  };
};

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const dashboard = useWorkspaceDashboardData({
    token: auth.token,
    clearSession: auth.clearSession,
  });

  if (dashboard.isInitialLoading) {
    return <PageLoadingState />;
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
  const diagnostics = dashboard.diagnosticsSummary;
  const documentDiagnostics = dashboard.documentDiagnosticsSummary;

  return (
    <main className="app-page flex flex-col gap-4 md:gap-5">
      <SectionHeader
        title="JobSeeker Dashboard"
        subtitle={`Signed in as ${auth.user?.email ?? 'unknown user'}`}
        action={
          <StatusPill
            value={summary.scrape.lastRunStatus ?? 'IDLE'}
            tone={getRunStatusTone(summary.scrape.lastRunStatus)}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            label: summary.scrape.lastRunAt ? formatDateTime(summary.scrape.lastRunAt) : 'No run yet',
            tone: getRunStatusTrendTone(summary.scrape.lastRunStatus),
          }}
        />
        <MetricCard
          label="Notebook Offers"
          value={String(summary.offers.total)}
          caption={`Scored: ${summary.offers.scored}`}
          trend={{
            label: summary.offers.total > 0 ? 'Ready for triage' : 'No offers yet',
            tone: summary.offers.total > 0 ? 'info' : 'warning',
          }}
        />
        <MetricCard
          label="Onboarding"
          value={summary.workflow.needsOnboarding ? 'Required' : 'Complete'}
          caption="Career preferences and profile readiness"
          trend={{
            label: summary.workflow.needsOnboarding ? 'Action required' : 'All set',
            tone: summary.workflow.needsOnboarding ? 'warning' : 'success',
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <div className="space-y-4">
          <Card title="Execution Playbook" description="Recommended operating rhythm for stable matching quality.">
            <ol className="text-text-soft list-decimal space-y-1.5 pl-5 text-sm">
              <li>Refresh profile input and uploaded CV whenever your targeting changes.</li>
              <li>Run scrape and wait for run finalization before reviewing job quality.</li>
              <li>Triage offers in strict mode first, then explore mode for discovery.</li>
              <li>Review diagnostics daily and rerun scrape with adjusted filters when failure rate rises.</li>
            </ol>
          </Card>

          {dashboard.isDiagnosticsLoading ? (
            <SectionLoadingState
              title="Scrape Diagnostics (72h)"
              description="Reliability and throughput of ingestion runs."
            />
          ) : dashboard.diagnosticsError ? (
            <SectionErrorState
              title="Scrape Diagnostics (72h)"
              message={dashboard.diagnosticsError}
              onRetry={() => {
                void dashboard.refetchDiagnostics();
              }}
            />
          ) : diagnostics ? (
            <Card title="Scrape Diagnostics (72h)" description="Reliability and throughput of ingestion runs.">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="app-muted-panel space-y-1">
                  <p className="text-text-soft">Total runs: {diagnostics.status.total}</p>
                  <p className="text-text-soft">Completed: {diagnostics.status.completed}</p>
                  <p className="text-text-soft">Failed: {diagnostics.status.failed}</p>
                  <p className="text-text-strong font-semibold">
                    Success rate: {(diagnostics.performance.successRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="app-muted-panel space-y-1">
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
                <div className="app-muted-panel space-y-1">
                  <p className="text-app-warning">Timeout failures: {diagnostics.failures.timeout}</p>
                  <p className="text-app-danger">Network failures: {diagnostics.failures.network}</p>
                  <p className="text-app-danger">Validation failures: {diagnostics.failures.validation}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {dashboard.isDocumentDiagnosticsLoading ? (
            <SectionLoadingState
              title="Document Diagnostics"
              description="Upload and extraction stage timings from persisted metrics."
            />
          ) : dashboard.documentDiagnosticsError ? (
            <SectionErrorState
              title="Document Diagnostics"
              message={dashboard.documentDiagnosticsError}
              onRetry={() => {
                void dashboard.refetchDocumentDiagnostics();
              }}
            />
          ) : documentDiagnostics ? (
            <Card
              title={`Document Diagnostics (${documentDiagnostics.windowHours}h)`}
              description="Upload and extraction stage timings from persisted metrics."
            >
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="app-muted-panel space-y-1">
                  <p className="text-text-soft">Samples: {documentDiagnostics.totals.samples}</p>
                  <p className="text-text-soft">Documents: {documentDiagnostics.totals.documentsWithMetrics}</p>
                </div>
                <div className="app-muted-panel space-y-1">
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
                <div className="app-muted-panel space-y-1">
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

        <aside className="space-y-4">
          {diagnostics ? (
            <Card title="Reliability Overview" description="Scheduler and scrape resilience signals.">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-soft text-sm">Run reliability</span>
                  <StatusPill
                    value={getReliabilityLabel(diagnostics.performance.successRate).label}
                    tone={getReliabilityLabel(diagnostics.performance.successRate).tone}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-soft text-sm">Timeout pressure</span>
                  <StatusPill
                    value={
                      diagnostics.failures.timeout > 0 ? `${diagnostics.failures.timeout} recent` : 'No recent issues'
                    }
                    tone={diagnostics.failures.timeout > 0 ? 'warning' : 'success'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-soft text-sm">Network failures</span>
                  <StatusPill
                    value={
                      diagnostics.failures.network > 0 ? `${diagnostics.failures.network} recent` : 'No recent issues'
                    }
                    tone={diagnostics.failures.network > 0 ? 'danger' : 'success'}
                  />
                </div>
              </div>
            </Card>
          ) : null}

          <Card title="Pipeline Health" description="Current readiness of core stages.">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-soft text-sm">Profile Input</span>
                <StatusPill
                  value={summary.profileInput.exists ? 'Ready' : 'Missing'}
                  tone={summary.profileInput.exists ? 'success' : 'warning'}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-soft text-sm">Career Profile</span>
                <StatusPill
                  value={summary.profile.exists ? 'Ready' : 'Missing'}
                  tone={summary.profile.exists ? 'success' : 'warning'}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-soft text-sm">Last Scrape</span>
                <StatusPill
                  value={summary.scrape.lastRunStatus ?? 'IDLE'}
                  tone={getRunStatusTone(summary.scrape.lastRunStatus)}
                />
              </div>
            </div>
          </Card>

          <Card title="Recent Activity" description="Key timestamps from workspace operations.">
            <div className="space-y-2 text-sm">
              <div className="app-muted-panel">
                <p className="text-text-soft">Profile updated</p>
                <p className="text-text-strong mt-1 font-medium">{formatDateTime(summary.profile.updatedAt)}</p>
              </div>
              <div className="app-muted-panel">
                <p className="text-text-soft">Offers last updated</p>
                <p className="text-text-strong mt-1 font-medium">{formatDateTime(summary.offers.lastUpdatedAt)}</p>
              </div>
              <div className="app-muted-panel">
                <p className="text-text-soft">Last scrape run</p>
                <p className="text-text-strong mt-1 font-medium">{formatDateTime(summary.scrape.lastRunAt)}</p>
              </div>
            </div>
          </Card>

          <Card title="Failure Guide" description="How to interpret most common run failures.">
            <ul className="text-text-soft list-disc space-y-1 pl-5 text-sm">
              <li>Timeout: source page too slow or overloaded.</li>
              <li>Network: temporary connectivity issue or upstream outage.</li>
              <li>Validation: scraped payload missing required structure.</li>
              <li>Callback: worker result could not be applied reliably.</li>
            </ul>
          </Card>
        </aside>
      </div>

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
                <th className="pb-2 pr-3">Title</th>
                <th className="pb-2 pr-3">Company</th>
                <th className="pb-2 pr-3">Location</th>
                <th className="pb-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-border/60 border-t">
                  <td className="text-text-strong py-2 pr-3">{offer.title}</td>
                  <td className="text-text-soft py-2 pr-3">{offer.company}</td>
                  <td className="text-text-soft py-2 pr-3">{offer.location ?? 'n/a'}</td>
                  <td className="py-2">
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
          <p className="text-text-soft text-sm">No offers yet. Enqueue scrape from notebook or tester tools.</p>
        )}
      </DataTableShell>
    </main>
  );
};

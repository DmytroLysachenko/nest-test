'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
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

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const dashboard = useWorkspaceDashboardData({
    token: auth.token,
    clearSession: auth.clearSession,
  });

  if (dashboard.isLoading || !dashboard.summary) {
    return <main className="app-page text-muted-foreground text-sm">Loading workspace...</main>;
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

          {diagnostics ? (
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

          {documentDiagnostics ? (
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
        </aside>
      </div>

      <DataTableShell title="Recent Offers" description="Quick preview of top offers from your notebook.">
        {offers.length ? (
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

'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import { Card } from '@/shared/ui/card';

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
    <main className="app-page flex flex-col gap-4">
      <header className="app-page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-title">Job Search Dashboard</h1>
          <p className="app-subtitle mt-1">Signed in as {auth.user?.email ?? 'unknown user'}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Profile" description="Current search profile status">
          <p className="text-secondary-foreground text-sm">Status: {summary.profile.status ?? 'n/a'}</p>
          <p className="text-secondary-foreground text-sm">Version: {summary.profile.version ?? 'n/a'}</p>
        </Card>
        <Card title="Scrape Runs" description="Latest ingestion state">
          <p className="text-secondary-foreground text-sm">Last run status: {summary.scrape.lastRunStatus ?? 'n/a'}</p>
          <p className="text-secondary-foreground text-sm">Total runs: {summary.scrape.totalRuns}</p>
        </Card>
        <Card title="Notebook" description="Materialized offers in your notebook">
          <p className="text-secondary-foreground text-sm">Total offers: {summary.offers.total}</p>
          <p className="text-secondary-foreground text-sm">Scored offers: {summary.offers.scored}</p>
        </Card>
      </div>

      <Card title="How It Works" description="Recommended weekly workflow for stable results.">
        <ol className="text-secondary-foreground list-decimal space-y-1 pl-5 text-sm">
          <li>Keep your profile and CV updated in onboarding/profile management.</li>
          <li>Run scraping, then wait for run status to complete before reviewing offers.</li>
          <li>Use strict mode first for trusted matches, then switch to explore mode for discovery.</li>
          <li>Save promising offers and rerun scraping once per day for fresh results.</li>
        </ol>
      </Card>

      {diagnostics ? (
        <Card title="Scrape diagnostics (72h)" description="Aggregated run reliability and throughput metrics.">
          <div className="text-secondary-foreground grid gap-3 text-sm md:grid-cols-3">
            <div className="space-y-1">
              <p>Total runs: {diagnostics.status.total}</p>
              <p>Completed: {diagnostics.status.completed}</p>
              <p>Failed: {diagnostics.status.failed}</p>
              <p>Success rate: {(diagnostics.performance.successRate * 100).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p>
                Avg duration:{' '}
                {diagnostics.performance.avgDurationMs == null ? 'n/a' : `${diagnostics.performance.avgDurationMs} ms`}
              </p>
              <p>
                P95 duration:{' '}
                {diagnostics.performance.p95DurationMs == null ? 'n/a' : `${diagnostics.performance.p95DurationMs} ms`}
              </p>
              <p>Avg scraped: {diagnostics.performance.avgScrapedCount ?? 'n/a'}</p>
            </div>
            <div className="space-y-1">
              <p>Timeout failures: {diagnostics.failures.timeout}</p>
              <p>Network failures: {diagnostics.failures.network}</p>
              <p>Validation failures: {diagnostics.failures.validation}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {documentDiagnostics ? (
        <Card
          title={`Document diagnostics (${documentDiagnostics.windowHours}h)`}
          description="Upload and extraction stage timings from persisted metrics."
        >
          <div className="text-secondary-foreground grid gap-3 text-sm md:grid-cols-3">
            <div className="space-y-1">
              <p>Samples: {documentDiagnostics.totals.samples}</p>
              <p>Documents: {documentDiagnostics.totals.documentsWithMetrics}</p>
            </div>
            <div className="space-y-1">
              <p>
                Upload confirm p95:{' '}
                {documentDiagnostics.stages.UPLOAD_CONFIRM.p95DurationMs == null
                  ? 'n/a'
                  : `${documentDiagnostics.stages.UPLOAD_CONFIRM.p95DurationMs} ms`}
              </p>
              <p>
                Extraction p95:{' '}
                {documentDiagnostics.stages.EXTRACTION.p95DurationMs == null
                  ? 'n/a'
                  : `${documentDiagnostics.stages.EXTRACTION.p95DurationMs} ms`}
              </p>
            </div>
            <div className="space-y-1">
              <p>Pipeline success: {(documentDiagnostics.stages.TOTAL_PIPELINE.successRate * 100).toFixed(1)}%</p>
              <p>
                Pipeline avg:{' '}
                {documentDiagnostics.stages.TOTAL_PIPELINE.avgDurationMs == null
                  ? 'n/a'
                  : `${documentDiagnostics.stages.TOTAL_PIPELINE.avgDurationMs} ms`}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Recent offers" description="Quick preview of top offers from your notebook.">
        {offers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-border/60 border-t">
                    <td className="text-foreground py-2">{offer.title}</td>
                    <td className="text-secondary-foreground py-2">{offer.company}</td>
                    <td className="text-secondary-foreground py-2">{offer.location ?? 'n/a'}</td>
                    <td className="text-secondary-foreground py-2">
                      {offer.matchScore == null ? 'n/a' : offer.matchScore.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No offers yet. Enqueue scrape from notebook or tester tools.</p>
        )}
      </Card>
    </main>
  );
};

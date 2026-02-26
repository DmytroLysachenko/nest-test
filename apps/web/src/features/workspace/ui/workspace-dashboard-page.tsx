'use client';

import Link from 'next/link';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const dashboard = useWorkspaceDashboardData({
    token: auth.token,
    clearSession: auth.clearSession,
  });

  if (dashboard.isLoading || !dashboard.summary) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">Loading workspace...</main>;
  }

  const summary = dashboard.summary;
  const offers = dashboard.offers;
  const diagnostics = dashboard.diagnosticsSummary;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Job Search Dashboard</h1>
          <p className="text-sm text-slate-600">Signed in as {auth.user?.email ?? 'unknown user'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/notebook" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Open notebook
          </Link>
          <Link href="/app/profile" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Manage profile
          </Link>
          <Link href="/app/onboarding" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Recreate profile
          </Link>
          <Button variant="secondary" onClick={() => dashboard.logout()} disabled={dashboard.isLoggingOut}>
            {dashboard.isLoggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Profile" description="Current search profile status">
          <p className="text-sm text-slate-700">Status: {summary.profile.status ?? 'n/a'}</p>
          <p className="text-sm text-slate-700">Version: {summary.profile.version ?? 'n/a'}</p>
        </Card>
        <Card title="Scrape Runs" description="Latest ingestion state">
          <p className="text-sm text-slate-700">Last run status: {summary.scrape.lastRunStatus ?? 'n/a'}</p>
          <p className="text-sm text-slate-700">Total runs: {summary.scrape.totalRuns}</p>
        </Card>
        <Card title="Notebook" description="Materialized offers in your notebook">
          <p className="text-sm text-slate-700">Total offers: {summary.offers.total}</p>
          <p className="text-sm text-slate-700">Scored offers: {summary.offers.scored}</p>
        </Card>
      </div>

      {diagnostics ? (
        <Card title="Scrape diagnostics (72h)" description="Aggregated run reliability and throughput metrics.">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <div className="space-y-1">
              <p>Total runs: {diagnostics.status.total}</p>
              <p>Completed: {diagnostics.status.completed}</p>
              <p>Failed: {diagnostics.status.failed}</p>
              <p>Success rate: {(diagnostics.performance.successRate * 100).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p>Avg duration: {diagnostics.performance.avgDurationMs == null ? 'n/a' : `${diagnostics.performance.avgDurationMs} ms`}</p>
              <p>P95 duration: {diagnostics.performance.p95DurationMs == null ? 'n/a' : `${diagnostics.performance.p95DurationMs} ms`}</p>
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

      <Card title="Recent offers" description="Quick preview of top offers from your notebook.">
        {offers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-900">{offer.title}</td>
                    <td className="py-2 text-slate-700">{offer.company}</td>
                    <td className="py-2 text-slate-700">{offer.location ?? 'n/a'}</td>
                    <td className="py-2 text-slate-700">{offer.matchScore == null ? 'n/a' : offer.matchScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No offers yet. Enqueue scrape from notebook or tester tools.</p>
        )}
      </Card>
    </main>
  );
};

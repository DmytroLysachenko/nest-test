'use client';

import { useQuery } from '@tanstack/react-query';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { listCallbackEvents } from '@/features/ops/api/ops-api';
import { getJobSourceHealth, listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { env } from '@/shared/config/env';
import { PageErrorState, PageLoadingState } from '@/shared/ui/async-states';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { HeroHeader, StatusPill } from '@/shared/ui/dashboard-primitives';

export const OpsPage = () => {
  const auth = useRequireAuth();
  const downloadCsv = async (path: string, fileName: string) => {
    if (!auth.token) {
      return;
    }
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sourceHealthQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.jobSources.sourceHealth(auth.token, 72),
      queryFn: (token) => getJobSourceHealth(token, 72),
      enabled: Boolean(auth.token && auth.user?.role === 'admin'),
    }),
  );

  const runsQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.jobSources.runs(auth.token, { limit: 25, windowHours: 168 }),
      queryFn: (token) => listJobSourceRuns(token, { limit: 25, windowHours: 168 }),
      enabled: Boolean(auth.token && auth.user?.role === 'admin'),
    }),
  );

  const callbackEventsQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.ops.callbackEvents(auth.token, { limit: 25 }),
      queryFn: (token) => listCallbackEvents(token, { limit: 25 }),
      enabled: Boolean(auth.token && auth.user?.role === 'admin'),
    }),
  );

  if (!auth.isHydrated || auth.isLoading) {
    return <PageLoadingState title="Loading ops workspace" subtitle="Checking admin session and operational data." />;
  }

  if (auth.user?.role !== 'admin') {
    return <PageErrorState title="Admin access required" message="This area is limited to admin sessions." />;
  }

  if (sourceHealthQuery.isLoading || runsQuery.isLoading || callbackEventsQuery.isLoading) {
    return <PageLoadingState title="Loading ops workspace" subtitle="Fetching source health and callback telemetry." />;
  }

  if (sourceHealthQuery.isError || runsQuery.isError || callbackEventsQuery.isError) {
    return (
      <PageErrorState
        title="Ops workspace unavailable"
        message="Unable to load one or more operational datasets."
        onRetry={() => {
          void sourceHealthQuery.refetch();
          void runsQuery.refetch();
          void callbackEventsQuery.refetch();
        }}
      />
    );
  }

  const sourceHealth = sourceHealthQuery.data?.items ?? [];
  const runs = runsQuery.data?.items ?? [];
  const callbackEvents = callbackEventsQuery.data?.items ?? [];

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Operations"
        title="Scrape Reliability Console"
        subtitle="Review run history, callback replay signals, and current source health without falling back to raw logs."
        meta={<span className="app-badge">Admin only</span>}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {sourceHealth.map((item) => (
          <Card key={item.source} title={item.source} description={`Last ${sourceHealthQuery.data?.windowHours ?? 72}h`}>
            <div className="space-y-2 text-sm">
              <p>Total runs: {item.totalRuns}</p>
              <p>Completed: {item.completedRuns}</p>
              <p>Failed: {item.failedRuns}</p>
              <p>Success rate: {(item.successRate * 100).toFixed(1)}%</p>
              <p>Timeout failures: {item.timeoutFailures}</p>
              <p>Callback failures: {item.callbackFailures}</p>
              <p>Stale heartbeat: {item.staleHeartbeatRuns}</p>
              <StatusPill
                value={item.latestRunStatus ?? 'UNKNOWN'}
                tone={item.latestRunStatus === 'COMPLETED' ? 'success' : item.latestRunStatus === 'FAILED' ? 'danger' : 'info'}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Recent Runs" description="Latest user-visible scrape runs with retry context.">
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="app-muted-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-text-strong font-medium">{run.id.slice(0, 8)}</p>
                    <p className="text-text-soft text-xs">{new Date(run.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusPill
                    value={run.status}
                    tone={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'info'}
                  />
                </div>
                <p className="text-text-soft mt-2 text-sm">Failure: {run.failureType ?? 'n/a'}</p>
                <p className="text-text-soft text-sm">Retry count: {run.retryCount ?? 0}</p>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                void downloadCsv('/job-sources/runs/export.csv', 'scrape-runs.csv');
              }}
            >
              Export runs CSV
            </Button>
          </div>
        </Card>

        <Card title="Callback Events" description="Recent callback attempt ledger for replay/debug workflows.">
          <div className="space-y-3">
            {callbackEvents.map((item) => (
              <div key={item.id} className="app-muted-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-text-strong font-medium">{item.eventId}</p>
                    <p className="text-text-soft text-xs">{item.sourceRunId}</p>
                  </div>
                  <StatusPill value={item.status} tone={item.status === 'FAILED' ? 'danger' : 'success'} />
                </div>
                <p className="text-text-soft mt-2 text-sm">Attempt: {item.attemptNo ?? 1}</p>
                <p className="text-text-soft text-sm">
                  Received: {item.receivedAt ? new Date(item.receivedAt).toLocaleString() : 'n/a'}
                </p>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                void downloadCsv('/ops/scrape/callback-events/export.csv', 'scrape-callback-events.csv');
              }}
            >
              Export callback CSV
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
};

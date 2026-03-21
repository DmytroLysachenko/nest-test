'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { exportCallbackEventsCsv, getSupportOverview, getSupportScrapeForensics } from '@/features/ops/api/ops-api';
import { PageErrorState, PageLoadingState } from '@/shared/ui/async-states';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { HeroHeader, MetricCard, SectionHeader, StatusPill } from '@/shared/ui/dashboard-primitives';

export const OpsPage = () => {
  const auth = useRequireAuth();
  const canReadOps = Boolean(auth.user?.permissions?.includes('ops.read'));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const downloadCsv = async (request: (token: string) => Promise<string>, fileName: string) => {
    if (!auth.token) {
      return;
    }
    const text = await request(auth.token);
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const supportOverviewQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.ops.supportOverview(auth.token, 72),
      queryFn: (token) => getSupportOverview(token, 72),
      enabled: Boolean(auth.token && canReadOps),
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
      gcTime: QUERY_GC_TIME.DEFAULT,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),
  );
  const runForensicsQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: ['ops', 'run-forensics', selectedRunId],
      queryFn: (token) => {
        if (!selectedRunId) {
          throw new Error('Run id is required');
        }
        return getSupportScrapeForensics(token, selectedRunId);
      },
      enabled: Boolean(auth.token && canReadOps && selectedRunId),
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
      gcTime: QUERY_GC_TIME.DEFAULT,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),
  );

  if (!auth.isHydrated || auth.isLoading) {
    return <PageLoadingState title="Loading ops workspace" subtitle="Checking admin session and support telemetry." />;
  }

  if (!canReadOps) {
    return (
      <PageErrorState title="Ops access required" message="This area is limited to sessions with ops permissions." />
    );
  }

  if (supportOverviewQuery.isLoading) {
    return <PageLoadingState title="Loading ops workspace" subtitle="Restoring the compact support overview." />;
  }

  if (supportOverviewQuery.isError || !supportOverviewQuery.data) {
    return (
      <PageErrorState
        title="Ops workspace unavailable"
        message="Unable to load the support overview bundle."
        onRetry={() => {
          void supportOverviewQuery.refetch();
        }}
      />
    );
  }

  const overview = supportOverviewQuery.data;
  const schedulerStatusTone =
    overview.metrics.scheduler.enqueueFailures24h > 0 || overview.metrics.scheduler.dueSchedules > 0
      ? 'warning'
      : 'success';

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Operations"
        title="Scrape Reliability Console"
        subtitle="Use the compact support snapshot to inspect scheduler health, scrape failures, callback issues, and API-side incidents without fanning out many background queries."
        meta={
          <>
            <span className="app-badge">Admin only</span>
            <span className="app-badge">Window: {overview.windowHours}h</span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void supportOverviewQuery.refetch();
              }}
            >
              Refresh snapshot
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void downloadCsv(exportCallbackEventsCsv, 'scrape-callback-events.csv');
              }}
            >
              Export callback CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active runs"
          value={String(overview.metrics.queue.activeRuns)}
          caption="Pending + running runs"
        />
        <MetricCard
          label="Scrape success"
          value={`${(overview.metrics.scrape.successRate * 100).toFixed(1)}%`}
          caption={`${overview.metrics.scrape.completedRuns}/${overview.metrics.scrape.totalRuns} completed`}
        />
        <MetricCard
          label="Scheduler due"
          value={String(overview.metrics.scheduler.dueSchedules)}
          caption={`Enqueue failures: ${overview.metrics.scheduler.enqueueFailures24h}`}
        />
        <MetricCard
          label="Callback failures"
          value={String(overview.metrics.callback.failedEvents)}
          caption={`Failed rate ${(overview.metrics.callback.failedRate * 100).toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card
          title="Scheduler Communication Health"
          description="The scheduler should only enqueue due schedules and should leave a clear trail when it fails."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Last trigger</p>
              <p className="text-text-strong mt-2 text-sm">
                {overview.metrics.scheduler.lastTriggerAt
                  ? new Date(overview.metrics.scheduler.lastTriggerAt).toLocaleString()
                  : 'No trigger recorded'}
              </p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Scheduler state</p>
              <div className="mt-2">
                <StatusPill
                  value={overview.metrics.scheduler.enqueueFailures24h > 0 ? 'Needs attention' : 'Healthy'}
                  tone={schedulerStatusTone}
                />
              </div>
              <p className="text-text-soft mt-2 text-sm">
                Due schedules: {overview.metrics.scheduler.dueSchedules}
                {' | '}
                Enqueue failures: {overview.metrics.scheduler.enqueueFailures24h}
              </p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Heartbeat risk</p>
              <p className="text-text-strong mt-2 text-sm">{overview.metrics.queue.runningWithoutHeartbeat}</p>
              <p className="text-text-soft mt-1 text-sm">Running jobs missing fresh heartbeats.</p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Retry success</p>
              <p className="text-text-strong mt-2 text-sm">
                {(overview.metrics.lifecycle.retrySuccessRate * 100).toFixed(1)}%
              </p>
              <p className="text-text-soft mt-1 text-sm">
                Retries triggered: {overview.metrics.lifecycle.retriesTriggered}
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Failure Mix"
          description="Use this to decide whether the issue lives in scheduling, worker execution, or callback acceptance."
        >
          <div className="space-y-3 text-sm">
            {Object.entries(overview.metrics.callback.failuresByType).length ? (
              Object.entries(overview.metrics.callback.failuresByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span className="text-text-soft">{type}</span>
                  <span className="text-text-strong font-medium">{count}</span>
                </div>
              ))
            ) : (
              <div className="app-muted-panel text-text-soft">
                No callback failure taxonomy recorded in this window.
              </div>
            )}
          </div>
        </Card>
      </div>

      {overview.stageFailures?.length ? (
        <Card
          title="Stage Failure Hotspots"
          description="DB-backed execution audit counts by worker stage, useful when callback or schedule failures do not explain the run state."
        >
          <div className="space-y-3 text-sm">
            {overview.stageFailures.map((item) => (
              <div key={`${item.stage}:${item.status}`} className="flex items-center justify-between gap-3">
                <span className="text-text-soft">
                  {item.stage}
                  {' | '}
                  {item.status}
                </span>
                <span className="text-text-strong font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          title="Recent failed runs"
          description="If these cluster around stale reconciliation, inspect schedule and callback flow first."
        >
          <div className="space-y-3">
            {overview.recentFailures.scrapeRuns.length ? (
              overview.recentFailures.scrapeRuns.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className="app-muted-panel w-full text-left"
                  onClick={() => {
                    setSelectedRunId(run.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-text-strong font-medium">{run.id.slice(0, 8)}</p>
                      <p className="text-text-soft text-xs">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <StatusPill value={run.failureType ?? 'unknown'} tone="danger" />
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{run.error ?? 'No error message recorded.'}</p>
                </button>
              ))
            ) : (
              <div className="app-muted-panel text-text-soft">No failed scrape runs recorded in this window.</div>
            )}
          </div>
        </Card>

        <Card
          title="Recent schedule failures"
          description="These events tell you when the scheduler itself failed before or during enqueue."
        >
          <div className="space-y-3">
            {overview.recentFailures.scheduleExecutions.length ? (
              overview.recentFailures.scheduleExecutions.map((event) => (
                <div key={event.id} className="app-muted-panel">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-text-strong font-medium">{event.eventType}</p>
                      <p className="text-text-soft text-xs">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                    <StatusPill value={event.severity} tone={event.severity === 'error' ? 'danger' : 'warning'} />
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{event.message}</p>
                  {event.sourceRunId ? <p className="text-text-soft text-xs">Run: {event.sourceRunId}</p> : null}
                </div>
              ))
            ) : (
              <div className="app-muted-panel text-text-soft">No failed schedule execution events recorded.</div>
            )}
          </div>
        </Card>

        <Card
          title="Recent API incidents"
          description="Persisted API warnings and errors correlated with user-facing endpoints."
        >
          <div className="space-y-3">
            {overview.recentFailures.apiRequests.length ? (
              overview.recentFailures.apiRequests.map((event) => (
                <div key={event.id} className="app-muted-panel">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-text-strong font-medium">
                        {event.method} {event.path}
                      </p>
                      <p className="text-text-soft text-xs">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="app-badge">{event.statusCode}</span>
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{event.message}</p>
                </div>
              ))
            ) : (
              <div className="app-muted-panel text-text-soft">No persisted API incidents recorded.</div>
            )}
          </div>
        </Card>
      </div>

      <Card
        title="Recent callback failures"
        description="These are callback-level failures. If this stays empty while runs still go stale, the worker likely never called back."
      >
        <SectionHeader
          title="Callback timeline"
          subtitle="Keep this exportable, but do not reload it independently until you need detail."
        />
        <div className="space-y-3">
          {overview.recentFailures.callbackEvents.length ? (
            overview.recentFailures.callbackEvents.map((event) => (
              <div key={event.id} className="app-muted-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-text-strong font-medium">{event.eventId}</p>
                    <p className="text-text-soft text-xs">{event.sourceRunId}</p>
                  </div>
                  <StatusPill value={event.status} tone="danger" />
                </div>
                <p className="text-text-soft mt-2 text-sm">
                  Attempt {event.attemptNo ?? 1}
                  {event.receivedAt ? ` | ${new Date(event.receivedAt).toLocaleString()}` : ''}
                </p>
              </div>
            ))
          ) : (
            <div className="app-muted-panel text-text-soft">No failed callback events recorded.</div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Recent Permission Denials"
          description="Authorization audit entries for denied admin/support actions."
        >
          <div className="space-y-3">
            {overview.recentFailures.authorizationEvents.length ? (
              overview.recentFailures.authorizationEvents.map((event) => (
                <div key={event.id} className="app-muted-panel">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-text-strong font-medium">{event.permission ?? 'unknown-permission'}</p>
                      <p className="text-text-soft text-xs">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                    <StatusPill value={event.outcome} tone="danger" />
                  </div>
                  <p className="text-text-soft mt-2 text-sm">{event.reason ?? 'Permission check denied.'}</p>
                </div>
              ))
            ) : (
              <div className="app-muted-panel text-text-soft">No recent permission denials recorded.</div>
            )}
          </div>
        </Card>

        <Card
          title="Run Forensics"
          description="Select a failed run to inspect worker execution stages, callback trail, and API timeline."
        >
          {!selectedRunId ? (
            <div className="app-muted-panel text-text-soft">Select a failed run to load forensic detail.</div>
          ) : runForensicsQuery.isLoading ? (
            <div className="app-muted-panel text-text-soft">Loading forensic detail.</div>
          ) : runForensicsQuery.isError || !runForensicsQuery.data ? (
            <div className="app-muted-panel text-text-soft">Unable to load forensic detail for the selected run.</div>
          ) : (
            <div className="space-y-3">
              <div className="app-muted-panel">
                <p className="text-text-strong font-medium">{runForensicsQuery.data.run.id}</p>
                <p className="text-text-soft mt-1 text-sm">
                  {runForensicsQuery.data.run.failureType ?? runForensicsQuery.data.run.status}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                {Object.entries(runForensicsQuery.data.stageSummary).map(([stage, summary]) => (
                  <div key={stage} className="flex items-center justify-between gap-3">
                    <span className="text-text-soft">{stage}</span>
                    <span className="text-text-strong font-medium">
                      {summary.total} total / {summary.failed} failed
                    </span>
                  </div>
                ))}
              </div>
              <div className="app-muted-panel text-text-soft text-sm">
                Callback events: {runForensicsQuery.data.callbackEvents.length}
                {' | '}
                Execution events: {runForensicsQuery.data.executionEvents.length}
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
};

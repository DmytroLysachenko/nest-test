'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { JobSourcesPanel } from '@/features/job-sources';
import { useWorkspaceDashboardData } from '@/features/workspace/model/hooks/use-workspace-dashboard-data';
import { PageErrorState, PageLoadingState, SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/button';
import { DataTableShell, HeroHeader, MetricCard, StatRow, StatusPill } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel, JourneySteps } from '@/shared/ui/guidance-panels';
import { Card } from '@/shared/ui/card';
import { WorkflowRecoveryPanel } from '@/shared/ui/workflow-recovery-panel';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

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

const getFocusHref = (groupKey: string, offerId: string) => {
  if (groupKey === 'follow-up-due') {
    return `/notebook?focus=followUpDue&offerId=${offerId}`;
  }
  if (groupKey === 'strict-top') {
    return `/notebook?focus=strictTop&offerId=${offerId}`;
  }
  if (groupKey === 'unscored-fresh') {
    return `/notebook?focus=unscored&offerId=${offerId}`;
  }
  return `/notebook?offerId=${offerId}`;
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
  const notebookSummary = dashboard.notebookSummary;
  const focusQueue = dashboard.focusQueue;
  const schedule = dashboard.schedule;
  const nextAction = summary.nextAction ?? {
    key: 'triage-notebook',
    title: 'Review your notebook',
    description: 'Use notebook and profile tools to keep the workspace moving.',
    href: '/notebook',
    priority: 'info' as const,
  };
  const health = summary.health ?? {
    readinessScore: 0,
    blockers: [],
    scrapeReliability: 'watch' as const,
  };
  const activity = summary.activity ?? [
    { key: 'profile', label: 'Profile updated', timestamp: summary.profile.updatedAt, tone: 'info' as const },
    { key: 'offers', label: 'Offers last updated', timestamp: summary.offers.lastUpdatedAt, tone: 'info' as const },
    { key: 'scrape', label: 'Last scrape run', timestamp: summary.scrape.lastRunAt, tone: 'info' as const },
  ];
  const latestRunStatus = summary.scrape.lastRunStatus ?? 'IDLE';
  const scrapeStageTone = getRunStatusTone(summary.scrape.lastRunStatus);
  const scrapeSetupHint =
    summary.scrape.totalRuns > 0
      ? 'You already have run history. Use Run now for a fresh refresh or keep the schedule on for continuous sourcing.'
      : 'Start with a profile-driven run. Once the results look good, enable a schedule so fresh leads arrive automatically.';

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Workspace Overview"
        title="JobSeeker Dashboard"
        subtitle="Operate your search like a modern command center: keep profile context current, run or schedule sourcing clearly, and triage the highest-signal opportunities without request noise or workflow ambiguity."
        meta={
          <>
            <span className="app-badge">Signed in as {auth.user?.email ?? 'unknown user'}</span>
            <span className="app-badge">Offers: {summary.offers.total}</span>
            <span className="app-badge">Runs: {summary.scrape.totalRuns}</span>
            <span className="app-badge">Readiness: {health.readinessScore}%</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/profile">
              <Button variant="secondary">Open profile</Button>
            </Link>
            <Link href="/notebook">
              <Button>Open notebook</Button>
            </Link>
            <StatusPill value={latestRunStatus} tone={scrapeStageTone} />
          </div>
        }
      />

      <GuidancePanel
        eyebrow="What to do next"
        title={nextAction.title}
        description={nextAction.description}
        tone={nextAction.priority === 'critical' ? 'warning' : 'info'}
        actionLabel="Open recommended flow"
        onAction={() => {
          window.location.href = nextAction.href;
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="app-glass-panel p-4">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Scrape state</p>
            <p className="text-text-strong mt-2 text-lg font-semibold">{latestRunStatus}</p>
            <p className="text-text-soft mt-2 text-sm leading-6">{scrapeSetupHint}</p>
          </div>
          <div className="app-glass-panel p-4">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Schedule</p>
            <p className="text-text-strong mt-2 text-lg font-semibold">
              {schedule?.enabled ? 'Automation enabled' : 'Manual mode'}
            </p>
            <p className="text-text-soft mt-2 text-sm leading-6">
              {schedule?.enabled
                ? `Next run ${formatDateTime(schedule.nextRunAt)}`
                : 'Set a schedule after you confirm the profile-driven run quality.'}
            </p>
          </div>
          <div className="app-glass-panel p-4">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Triage focus</p>
            <p className="text-text-strong mt-2 text-lg font-semibold">{summary.offers.followUpDue} follow-ups due</p>
            <p className="text-text-soft mt-2 text-sm leading-6">
              Start with due follow-ups and strict-top matches before broader exploration.
            </p>
          </div>
        </div>
      </GuidancePanel>

      <div className="app-grid-cards">
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
          label="Pipeline Progress"
          value={String(summary.offers.applied)}
          caption="Active job applications"
          trend={{
            label: `${summary.offers.followUpDue} follow-ups due`,
            tone: summary.offers.followUpDue > 0 ? 'warning' : 'info',
          }}
        />
        <MetricCard
          label="Document Recovery"
          value={String(summary.documents.failed)}
          caption="Failed document extractions"
          trend={{
            label:
              summary.documents.failed > 0
                ? 'Retry failed document extraction'
                : `${summary.documents.ready} ready documents`,
            tone: summary.documents.failed > 0 ? 'danger' : 'success',
          }}
        />
        <MetricCard
          label="Total Leads"
          value={String(summary.offers.total)}
          caption={`Scored: ${summary.offers.scored}`}
          trend={{
            label: summary.offers.total > 0 ? 'Ready for triage' : 'No offers yet',
            tone: summary.offers.total > 0 ? 'info' : 'warning',
          }}
        />
        <MetricCard
          label="Readiness Score"
          value={`${health.readinessScore}%`}
          caption={`Next: ${nextAction.title}`}
          trend={{
            label: health.blockers.length ? health.blockers.join(', ') : 'Workspace unblocked',
            tone:
              health.scrapeReliability === 'stable'
                ? 'success'
                : health.scrapeReliability === 'watch'
                  ? 'warning'
                  : 'danger',
          }}
        />
      </div>

      <JourneySteps
        title="Smoothest daily flow"
        description="This is the shortest path from profile changes to fresh leads and controlled triage."
        steps={[
          {
            key: 'profile',
            title: 'Update profile context',
            description: 'Keep profile inputs and documents aligned before starting a run.',
            status: summary.profile.exists ? 'done' : 'active',
          },
          {
            key: 'scrape',
            title: 'Run or schedule scraping',
            description:
              'Run manually when you need immediate fresh leads, then enable schedule once the setup feels right.',
            status: latestRunStatus === 'RUNNING' || latestRunStatus === 'PENDING' ? 'active' : 'upcoming',
          },
          {
            key: 'triage',
            title: 'Review notebook focus',
            description: 'Wait for completion, then act on strict-top matches and due follow-ups first.',
            status: summary.offers.total > 0 ? 'done' : 'upcoming',
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card title="Job Search Funnel" description="Visual breakdown of your application stages.">
          <div className="space-y-4 pt-2">
            {[
              { label: 'Leads Found', value: summary.offers.total, color: 'bg-primary/20' },
              { label: 'AI Scored', value: summary.offers.scored, color: 'bg-primary/40' },
              { label: 'Saved for later', value: summary.offers.saved, color: 'bg-primary/60' },
              { label: 'Applied', value: summary.offers.applied, color: 'bg-primary/80' },
              { label: 'Interviewing', value: summary.offers.interviewing, color: 'bg-primary' },
              { label: 'Offers Received', value: summary.offers.offersMade, color: 'bg-app-success' },
            ].map((stage, i) => {
              const percentage = summary.offers.total > 0 ? (stage.value / summary.offers.total) * 100 : 0;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-xs font-medium">
                    <span className="text-text-soft">{stage.label}</span>
                    <span className="text-text-strong">{stage.value}</span>
                  </div>
                  <div className="bg-surface-muted border-border/40 h-3 w-full overflow-hidden rounded-full border">
                    <div
                      className={`h-full transition-all duration-500 ease-out ${stage.color}`}
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Scraper Health" description="Last run performance diagnostics.">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-soft text-sm font-medium">Status</span>
              <StatusPill
                value={summary.scrape.lastRunStatus ?? 'UNKNOWN'}
                tone={summary.scrape.lastRunStatus === 'COMPLETED' ? 'success' : 'warning'}
              />
            </div>

            {summary.scrape.lastRunProgress ? (
              <div className="space-y-3">
                <StatRow label="Phase" value={String(summary.scrape.lastRunProgress.phase ?? 'n/a')} />
                <StatRow label="Visited" value={`${summary.scrape.lastRunProgress.pagesVisited} pages`} />
                <StatRow label="Discovered" value={`${summary.scrape.lastRunProgress.jobLinksDiscovered} links`} />
                <div className="border-border/40 border-t pt-2">
                  <p className="text-text-soft mb-1 text-[10px] font-bold uppercase tracking-wider">Latest activity</p>
                  <p className="text-text-strong truncate text-xs">
                    {String(
                      summary.scrape.lastRunProgress.updatedAt
                        ? new Date(String(summary.scrape.lastRunProgress.updatedAt)).toLocaleTimeString()
                        : 'n/a',
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="app-muted-panel py-8 text-center">
                <p className="text-text-soft text-xs italic">No progress data available</p>
              </div>
            )}

            {diagnosticsEnabled ? (
              <Button
                variant="secondary"
                className="h-9 w-full text-xs"
                onClick={() => (window.location.href = auth.user?.role === 'admin' ? '/ops' : '/tester')}
              >
                View Full Diagnostics
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <WorkflowRecoveryPanel blockers={summary.blockerDetails ?? []} />

      <section className="app-section-grid">
        <div className="space-y-4">
          <JobSourcesPanel token={auth.token!} />

          {diagnosticsEnabled && dashboard.isDiagnosticsLoading ? (
            <SectionLoadingState
              title="Scrape Diagnostics (72h)"
              description="Reliability and throughput of ingestion runs."
            />
          ) : diagnosticsEnabled && dashboard.diagnosticsError ? (
            <SectionErrorState
              title="Scrape Diagnostics (72h)"
              message={dashboard.diagnosticsError}
              onRetry={() => {
                void dashboard.refetchDiagnostics();
              }}
            />
          ) : diagnosticsEnabled && diagnostics ? (
            <Card title="Scrape Diagnostics (72h)" description="Reliability and throughput of ingestion runs.">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft">Total runs: {diagnostics.status.total}</p>
                  <p className="text-text-soft">Completed: {diagnostics.status.completed}</p>
                  <p className="text-text-soft">Failed: {diagnostics.status.failed}</p>
                  <p className="text-text-strong font-semibold">
                    Success rate: {(diagnostics.performance.successRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="app-muted-panel space-y-2">
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
                <div className="app-muted-panel space-y-2">
                  <p className="text-app-warning">Timeout failures: {diagnostics.failures.timeout}</p>
                  <p className="text-app-danger">Network failures: {diagnostics.failures.network}</p>
                  <p className="text-app-danger">Validation failures: {diagnostics.failures.validation}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {diagnosticsEnabled && dashboard.isDocumentDiagnosticsLoading ? (
            <SectionLoadingState
              title="Document Diagnostics"
              description="Upload and extraction stage timings from persisted metrics."
            />
          ) : diagnosticsEnabled && dashboard.documentDiagnosticsError ? (
            <SectionErrorState
              title="Document Diagnostics"
              message={dashboard.documentDiagnosticsError}
              onRetry={() => {
                void dashboard.refetchDocumentDiagnostics();
              }}
            />
          ) : diagnosticsEnabled && documentDiagnostics ? (
            <Card
              title={`Document Diagnostics (${documentDiagnostics.windowHours}h)`}
              description="Upload and extraction stage timings from persisted metrics."
            >
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft">Samples: {documentDiagnostics.totals.samples}</p>
                  <p className="text-text-soft">Documents: {documentDiagnostics.totals.documentsWithMetrics}</p>
                </div>
                <div className="app-muted-panel space-y-2">
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
                <div className="app-muted-panel space-y-2">
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
          <GuidancePanel
            eyebrow="Operator tip"
            title="When should you use Run now vs Schedule?"
            description="Use Run now when your profile changed or you want an immediate fresh pass. Use Schedule only after the profile-driven run is returning leads you actually want to triage."
            tone="success"
          />

          {diagnosticsEnabled && diagnostics ? (
            <Card title="Reliability Overview" description="Scheduler and scrape resilience signals.">
              <div className="space-y-3">
                <StatRow
                  label="Run reliability"
                  value={getReliabilityLabel(diagnostics.performance.successRate).label}
                  tone={getReliabilityLabel(diagnostics.performance.successRate).tone}
                />
                <StatRow
                  label="Timeout pressure"
                  value={
                    diagnostics.failures.timeout > 0 ? `${diagnostics.failures.timeout} recent` : 'No recent issues'
                  }
                  tone={diagnostics.failures.timeout > 0 ? 'warning' : 'success'}
                />
                <StatRow
                  label="Network failures"
                  value={
                    diagnostics.failures.network > 0 ? `${diagnostics.failures.network} recent` : 'No recent issues'
                  }
                  tone={diagnostics.failures.network > 0 ? 'danger' : 'success'}
                />
              </div>
            </Card>
          ) : null}

          <Card title="Pipeline Health" description="Current readiness of core stages.">
            <div className="space-y-3">
              <StatRow
                label="Profile Input"
                value={summary.profileInput.exists ? 'Ready' : 'Missing'}
                tone={summary.profileInput.exists ? 'success' : 'warning'}
              />
              <StatRow
                label="Career Profile"
                value={summary.profile.exists ? 'Ready' : 'Missing'}
                tone={summary.profile.exists ? 'success' : 'warning'}
              />
              <StatRow
                label="Last Scrape"
                value={summary.scrape.lastRunStatus ?? 'IDLE'}
                tone={getRunStatusTone(summary.scrape.lastRunStatus)}
              />
            </div>
          </Card>

          <Card title="Recent Activity" description="Key timestamps from workspace operations.">
            <div className="space-y-3 text-sm">
              {activity.map((item) => (
                <div key={item.key} className="app-muted-panel">
                  <p className="text-text-soft">{item.label}</p>
                  <p className="text-text-strong mt-1 font-medium">{formatDateTime(item.timestamp)}</p>
                </div>
              ))}
            </div>
          </Card>

          {summary.readinessBreakdown?.length ? (
            <Card title="Readiness Breakdown" description="Server-driven stage health for setup and daily usage.">
              <div className="space-y-3">
                {summary.readinessBreakdown.map((step) => (
                  <div key={step.key} className="app-muted-panel">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{step.label}</p>
                      <StatusPill value={step.ready ? 'ready' : 'blocked'} tone={step.ready ? 'success' : 'warning'} />
                    </div>
                    <p className="text-text-soft mt-2 text-sm">{step.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {notebookSummary ? (
            <Card title="Notebook Focus" description="Suggested buckets for the next triage session.">
              <div className="space-y-3">
                {notebookSummary.quickActions.map((item) => {
                  const tone = item.count > 0 ? 'warning' : 'success';
                  return (
                    <Link key={item.key} href={item.href} className="block">
                      <StatRow label={item.label} value={String(item.count)} tone={tone} />
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {focusQueue?.groups?.length ? (
            <Card title="Focus Queue" description="Small set of offers to act on first in the next session.">
              <div className="space-y-4">
                {focusQueue.groups.map((group) => (
                  <div key={group.key} className="app-muted-panel space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-strong text-sm font-semibold">{group.label}</p>
                      <span className="app-badge">{group.count}</span>
                    </div>
                    {group.items.length ? (
                      group.items.map((item) => (
                        <div
                          key={item.id}
                          className="border-border/40 border-t pt-2 text-sm first:border-t-0 first:pt-0"
                        >
                          <Link
                            href={getFocusHref(group.key, item.id)}
                            className="text-text-strong font-medium hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-text-soft text-xs">
                            {item.company ?? 'Unknown company'} · {item.location ?? 'Unknown location'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-text-soft text-xs">No offers in this queue right now.</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card title="Failure Guide" description="How to interpret most common run failures.">
            <div className="space-y-3">
              {[
                ['Timeout', 'Source page too slow or overloaded.'],
                ['Network', 'Temporary connectivity issue or upstream outage.'],
                ['Validation', 'Scraped payload missing required structure.'],
                ['Callback', 'Worker result could not be applied reliably.'],
              ].map(([label, description]) => (
                <div key={label} className="app-muted-panel">
                  <p className="text-text-strong text-sm font-semibold">{label}</p>
                  <p className="text-text-soft mt-1 text-sm">{description}</p>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </section>

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
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Title</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Company</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Location</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-[0.12em]">Score</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-border/60 border-t align-top">
                  <td className="py-3 pr-3">
                    <div>
                      <p className="text-text-strong font-medium">{offer.title}</p>
                      <p className="text-text-soft mt-1 text-xs">Offer ID {offer.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="text-text-soft py-3 pr-3">{offer.company}</td>
                  <td className="text-text-soft py-3 pr-3">{offer.location ?? 'n/a'}</td>
                  <td className="py-3">
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
          <div className="p-4">
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No offers yet"
              description="Enqueue a scrape from notebook or tester tools to populate the workspace."
            />
          </div>
        )}
      </DataTableShell>
    </main>
  );
};

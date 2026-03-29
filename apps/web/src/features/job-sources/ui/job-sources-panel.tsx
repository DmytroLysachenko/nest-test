'use client';

import { CalendarClock, PlayCircle, Radar } from 'lucide-react';

import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { GuidancePanel, JourneySteps } from '@/shared/ui/guidance-panels';
import { Input } from '@/shared/ui/input';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

type JobSourcesPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const JobSourcesPanel = ({ token, disabled = false, disabledReason }: JobSourcesPanelProps) => {
  const jobSourcesPanel = useJobSourcesPanel(token);
  const {
    register,
    formState: { errors },
  } = jobSourcesPanel.form;
  const {
    register: registerSchedule,
    formState: { errors: scheduleErrors },
  } = jobSourcesPanel.scheduleForm;
  const preflight = jobSourcesPanel.preflightQuery.data;
  const sourceHealth = jobSourcesPanel.sourceHealthQuery.data?.items?.[0] ?? null;
  const formatTimestamp = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : 'n/a');
  const getStoryTone = (value?: 'positive' | 'warning' | 'danger' | 'neutral') => {
    if (value === 'positive') {
      return 'border-app-success-border bg-app-success-soft';
    }
    if (value === 'danger') {
      return 'border-app-danger-border bg-app-danger-soft';
    }
    if (value === 'warning') {
      return 'border-app-warning-border bg-app-warning-soft';
    }
    return 'border-border/60 bg-surface/70';
  };

  return (
    <Card
      title="Scrape Control Center"
      description="Run a one-off sourcing pass, confirm whether the system is ready, and manage the schedule that keeps your notebook fresh."
      className="overflow-hidden"
    >
      <GuidancePanel
        eyebrow="How to use this"
        title="Two reliable ways to start scraping"
        description="Use Run now when you changed profile targets or want fresh results immediately. Use Schedule when you want the system to keep your notebook topped up automatically."
        tone="info"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border-primary/20 rounded-[1.35rem] border bg-white/55 p-4">
            <div className="mb-3 flex items-center gap-2">
              <PlayCircle className="text-primary h-4 w-4" />
              <p className="text-text-strong text-sm font-semibold">Run now</p>
            </div>
            <p className="text-text-soft text-sm leading-6">
              Best when you updated profile inputs, uploaded a new CV, or want a fresh sourcing pass before triaging.
            </p>
          </div>
          <div className="border-border/70 rounded-[1.35rem] border bg-white/55 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="text-text-strong h-4 w-4" />
              <p className="text-text-strong text-sm font-semibold">Schedule</p>
            </div>
            <p className="text-text-soft text-sm leading-6">
              Best when the profile is stable and you want new leads to arrive on a consistent cadence without manual
              action.
            </p>
          </div>
        </div>
      </GuidancePanel>

      <JourneySteps
        title="Recommended sourcing loop"
        description="This keeps quality high and avoids confusion about what the scrape is using."
        className="mt-5"
        steps={[
          {
            key: 'profile',
            title: 'Confirm profile context',
            description:
              'Keep profile input and ready documents up to date so profile-derived filtering stays relevant.',
            status: preflight?.resolvedFromProfile ? 'done' : 'active',
          },
          {
            key: 'run',
            title: 'Run or schedule scrape',
            description: 'Use a manual run for immediate refresh or turn on a schedule once your targeting is stable.',
            status: preflight?.ready ? 'active' : 'upcoming',
          },
          {
            key: 'triage',
            title: 'Review notebook',
            description: 'Wait for completion, then triage fresh offers in strict mode before exploring wider matches.',
            status: jobSourcesPanel.runsQuery.data?.items?.[0]?.status === 'COMPLETED' ? 'done' : 'upcoming',
          },
        ]}
      />

      {sourceHealth ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-text-strong font-semibold">Source health (72h)</p>
            <span className="app-badge">usable run rate: {(sourceHealth.usableRunRate * 100).toFixed(1)}%</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InspectorRow label="Success rate" value={`${(sourceHealth.successRate * 100).toFixed(1)}%`} />
            <InspectorRow label="Avg useful offers" value={String(sourceHealth.avgUsefulOfferCount)} />
            <InspectorRow label="Silent failures" value={String(sourceHealth.silentFailureRuns)} />
          </div>
        </div>
      ) : null}

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobSourcesPanel.submit(event);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="app-badge">One-off run</span>
          <span className="text-text-soft text-xs">This creates a single scrape request immediately.</span>
        </div>
        <div className="app-field-group">
          <Label htmlFor="scrape-mode" className="app-inline-label">
            Source mode
          </Label>
          <select id="scrape-mode" className="app-select" {...register('mode')}>
            <option value="profile">Use my active profile and saved filters</option>
            <option value="custom">Use a custom listing URL for a one-off run</option>
          </select>
        </div>

        <div className="app-field-group">
          <Label htmlFor="listing-url" className="app-inline-label">
            Listing URL
          </Label>
          <Input
            id="listing-url"
            placeholder="https://it.pracuj.pl/praca?..."
            disabled={jobSourcesPanel.mode !== 'custom'}
            {...register('listingUrl')}
          />
          <p className="text-text-soft text-xs">
            Leave this disabled for the recommended profile-driven mode. Use it only when you want to test a specific
            listing source manually.
          </p>
          {errors.listingUrl?.message ? (
            <WorkflowInlineNotice
              title="Listing URL needs correction"
              description={errors.listingUrl.message}
              tone="danger"
            />
          ) : null}
        </div>

        <div className="app-field-group">
          <Label htmlFor="listing-limit" className="app-inline-label">
            Limit
          </Label>
          <Input id="listing-limit" type="number" min={1} max={100} {...register('limit')} />
          <p className="text-text-soft text-xs">
            Keep this lower for quick validation, higher for a wider sourcing pass.
          </p>
          {errors.limit?.message ? (
            <WorkflowInlineNotice title="Run limit needs correction" description={errors.limit.message} tone="danger" />
          ) : null}
        </div>

        {errors.root?.message ? (
          <WorkflowFeedback title="Unable to start the scrape run" description={errors.root.message} tone="danger" />
        ) : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? (
            <WorkflowInlineNotice
              title="Run actions are temporarily locked"
              description={disabledReason}
              tone="warning"
            />
          ) : preflight && !preflight.ready ? (
            <WorkflowInlineNotice
              title="Resolve blockers before you run"
              description="The current sourcing context is not ready yet. Clear the blockers below before enqueueing a new run."
              tone="warning"
            />
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={disabled || jobSourcesPanel.isSubmitting || Boolean(preflight && !preflight.ready)}
          >
            {jobSourcesPanel.isSubmitting ? 'Starting run...' : 'Run scrape now'}
          </Button>
        </div>
      </form>

      {preflight ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-text-strong font-semibold">Preflight</p>
            <span className={preflight.ready ? 'text-app-success' : 'text-app-warning'}>
              {preflight.ready ? 'Ready to run' : 'Action required'}
            </span>
          </div>
          <WorkflowInlineNotice
            title={preflight.ready ? 'Sourcing context looks ready' : 'Preflight found blockers or warnings'}
            description={preflight.guidance}
            tone={preflight.ready ? 'success' : 'warning'}
          />
          <InspectorRow label="Source" value={preflight.source ?? 'n/a'} />
          <InspectorRow label="Listing URL" value={preflight.listingUrl ?? 'n/a'} />
          <InspectorRow label="Active runs" value={String(preflight.activeRunCount)} />
          <InspectorRow
            label="Daily remaining"
            value={preflight.dailyRemaining == null ? 'n/a' : String(preflight.dailyRemaining)}
          />
          <InspectorRow
            label="Schedule"
            value={
              preflight.schedule.enabled
                ? `${preflight.schedule.cron ?? 'n/a'} | next ${formatTimestamp(preflight.schedule.nextRunAt)}`
                : 'No schedule configured yet'
            }
          />
          {preflight.blockerDetails.length ? (
            <div>
              <p className="text-text-strong font-medium">Blockers</p>
              <div className="mt-2 space-y-2">
                {preflight.blockerDetails.map((blocker) => (
                  <WorkflowFeedback
                    key={blocker.code}
                    title={blocker.title}
                    description={blocker.description}
                    tone="warning"
                    actionLabel={blocker.ctaLabel}
                    onAction={() => (window.location.href = blocker.href)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {preflight.warningDetails.length ? (
            <div>
              <p className="text-text-strong font-medium">Warnings</p>
              <div className="mt-2 space-y-2">
                {preflight.warningDetails.map((warning) => (
                  <WorkflowInlineNotice
                    key={warning.code}
                    title={warning.title}
                    description={warning.description}
                    tone="info"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {jobSourcesPanel.enqueueResult ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <p className="text-text-strong font-semibold">Latest enqueue metadata</p>
          <InspectorRow label="Status" value={jobSourcesPanel.enqueueResult.status} />
          {jobSourcesPanel.enqueueResult.resolvedFromProfile ? (
            <InspectorRow label="Resolved from active profile" value="yes" />
          ) : null}
          {jobSourcesPanel.enqueueResult.intentFingerprint ? (
            <InspectorRow label="Intent fingerprint" value={jobSourcesPanel.enqueueResult.intentFingerprint} />
          ) : null}
          {jobSourcesPanel.enqueueResult.acceptedFilters ? (
            <details className="mt-2">
              <summary className="text-text-strong cursor-pointer font-medium">Accepted filters</summary>
              <pre className="app-code mt-2 whitespace-pre-wrap">
                {JSON.stringify(jobSourcesPanel.enqueueResult.acceptedFilters, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <form className="app-muted-panel mt-5 space-y-4" onSubmit={jobSourcesPanel.submitSchedule}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Radar className="text-primary h-4 w-4" />
              <p className="text-text-strong text-sm font-semibold">Automation schedule</p>
            </div>
            <p className="text-text-soft text-xs">
              Turn this on once your targeting is stable. The schedule uses your saved profile-driven sourcing context.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...registerSchedule('enabled')} />
            Enabled
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('weekdays-morning')}
          >
            Weekdays 08:00
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('daily-evening')}
          >
            Daily 18:00
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('paused')}
          >
            Pause
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-field-group">
            <Label htmlFor="schedule-cron" className="app-inline-label">
              Cron
            </Label>
            <Input id="schedule-cron" placeholder="0 9 * * *" {...registerSchedule('cron')} />
            <p className="text-text-soft text-xs">
              Examples: `0 8 * * 1-5` for weekdays at 08:00, `0 18 * * *` for every day at 18:00.
            </p>
            {scheduleErrors.cron?.message ? (
              <WorkflowInlineNotice
                title="Cron needs correction"
                description={scheduleErrors.cron.message}
                tone="danger"
              />
            ) : null}
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-timezone" className="app-inline-label">
              Timezone
            </Label>
            <Input id="schedule-timezone" placeholder="Europe/Warsaw" {...registerSchedule('timezone')} />
            <p className="text-text-soft text-xs">
              Used for operator clarity in the UI. The backend still evaluates cron in UTC.
            </p>
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-source" className="app-inline-label">
              Source
            </Label>
            <select id="schedule-source" className="app-select" {...registerSchedule('source')}>
              <option value="pracuj-pl-it">Pracuj IT</option>
              <option value="pracuj-pl">Pracuj generic</option>
              <option value="pracuj-pl-general">Pracuj general</option>
            </select>
            <p className="text-text-soft text-xs">Choose the feed you want the schedule to target by default.</p>
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-limit" className="app-inline-label">
              Limit
            </Label>
            <Input id="schedule-limit" type="number" min={1} max={100} {...registerSchedule('limit')} />
            <p className="text-text-soft text-xs">
              Use smaller batches for tighter review cycles and larger batches for wider discovery.
            </p>
            {scheduleErrors.limit?.message ? (
              <WorkflowInlineNotice
                title="Schedule limit needs correction"
                description={scheduleErrors.limit.message}
                tone="danger"
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InspectorRow label="Last result" value={jobSourcesPanel.scheduleResult?.lastRunStatus ?? 'n/a'} />
          <InspectorRow
            label="Last triggered"
            value={formatTimestamp(jobSourcesPanel.scheduleResult?.lastTriggeredAt)}
          />
          <InspectorRow label="Next run" value={formatTimestamp(jobSourcesPanel.scheduleResult?.nextRunAt)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-text-soft text-xs">
            Saving the schedule does not start a run immediately. Use Trigger now if you want the schedule config
            applied right away.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={jobSourcesPanel.isSavingSchedule}>
              {jobSourcesPanel.isSavingSchedule ? 'Saving...' : 'Save schedule'}
            </Button>
            <Button
              type="button"
              disabled={!jobSourcesPanel.scheduleResult?.enabled || jobSourcesPanel.isTriggeringSchedule}
              onClick={() => jobSourcesPanel.triggerScheduleNow()}
            >
              {jobSourcesPanel.isTriggeringSchedule ? 'Triggering...' : 'Trigger scheduled run now'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        <p className="text-text-strong text-sm font-semibold">Recent runs</p>
        <p className="text-text-soft text-xs">
          This should explain whether the run was useful before you need to inspect raw counters.
        </p>
        {jobSourcesPanel.runsQuery.data?.items?.length ? (
          jobSourcesPanel.runsQuery.data.items.map((run) => (
            <article key={run.id} className="app-muted-panel space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-badge">status: {run.status}</span>
                <span className="app-badge">useful offers: {run.usefulOfferCount ?? run.scrapedCount ?? 0}</span>
                <span className="app-badge">found: {run.totalFound ?? 0}</span>
                {run.silentFailure ? <span className="app-badge">silent failure</span> : null}
              </div>
              <div className={`rounded-2xl border p-3 ${getStoryTone(run.story?.userVisibility)}`}>
                <p className="text-text-strong font-semibold">
                  {run.story?.summary ?? 'Run finished without a readable summary.'}
                </p>
                <p className="text-text-soft mt-1">{run.story?.recommendedAction ?? 'Open diagnostics for detail.'}</p>
              </div>
              <InspectorRow
                label="Finished"
                value={formatTimestamp(run.finalizedAt ?? run.completedAt ?? run.createdAt)}
              />
              <InspectorRow label="Run id" value={run.id} />
              {diagnosticsEnabled ? (
                <Button type="button" variant="secondary" onClick={() => jobSourcesPanel.setSelectedRunId(run.id)}>
                  {jobSourcesPanel.selectedRunId === run.id ? 'Showing diagnostics' : 'Show diagnostics'}
                </Button>
              ) : null}
              {run.error ? <WorkflowInlineNotice title="Run error" description={run.error} tone="danger" /> : null}
            </article>
          ))
        ) : (
          <EmptyState
            title="No runs yet"
            description="Use a manual run once your profile context is ready, or save a schedule first if you want sourcing to stay automatic."
          />
        )}
      </div>

      {diagnosticsEnabled && jobSourcesPanel.diagnosticsQuery.data ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <p className="text-text-strong font-semibold">Run diagnostics</p>
          <div
            className={`rounded-2xl border p-3 ${getStoryTone(jobSourcesPanel.diagnosticsQuery.data.story?.userVisibility)}`}
          >
            <p className="text-text-strong font-semibold">{jobSourcesPanel.diagnosticsQuery.data.story?.summary}</p>
            <p className="text-text-soft mt-1">{jobSourcesPanel.diagnosticsQuery.data.story?.recommendedAction}</p>
          </div>
          <InspectorRow label="Run id" value={jobSourcesPanel.diagnosticsQuery.data.runId} />
          <InspectorRow label="Status" value={jobSourcesPanel.diagnosticsQuery.data.status} />
          <InspectorRow
            label="Outcome"
            value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.classifiedOutcome ?? 'n/a'}
          />
          <InspectorRow
            label="Silent failure"
            value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.silentFailure ? 'yes' : 'no'}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border-border/60 bg-surface/70 rounded-2xl border p-3">
              <p className="text-text-strong font-medium">Acquisition</p>
              <div className="mt-2 space-y-1">
                <InspectorRow
                  label="Pages visited"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.stageMetrics?.fetch.pagesVisited ??
                      jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.pagesVisited,
                  )}
                />
                <InspectorRow
                  label="Listings found"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.stageMetrics?.fetch.jobLinksDiscovered ??
                      jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.jobLinksDiscovered,
                  )}
                />
                <InspectorRow
                  label="Blocked pages"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.stageMetrics?.fetch.blockedPages ??
                      jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.blockedPages,
                  )}
                />
                <InspectorRow
                  label="Browser fallbacks"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.stageMetrics?.fetch.browserFallbacks ?? 0,
                  )}
                />
                <InspectorRow
                  label="Detail attempts"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.stageMetrics?.fetch.detailAttemptedCount ??
                      jobSourcesPanel.diagnosticsQuery.data.diagnostics.productivity?.detailAttemptedCount ??
                      0,
                  )}
                />
              </div>
            </div>
            <div className="border-border/60 bg-surface/70 rounded-2xl border p-3">
              <p className="text-text-strong font-medium">Notebook visibility</p>
              <div className="mt-2 space-y-1">
                <InspectorRow
                  label="Useful offers"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.notebookVisibility?.usefulOfferCount ?? 0,
                  )}
                />
                <InspectorRow
                  label="Candidate offers"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.notebookVisibility?.candidateOffers ?? 0,
                  )}
                />
                <InspectorRow
                  label="Matched offers"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.notebookVisibility?.matchedOffers ?? 0,
                  )}
                />
                <InspectorRow
                  label="Notebook inserted"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.notebookVisibility?.userInsertedOffers ?? 0,
                  )}
                />
                <InspectorRow
                  label="Hidden by strict"
                  value={String(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.notebookVisibility?.hiddenByStrict ?? 0,
                  )}
                />
              </div>
            </div>
          </div>
          {jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts ? (
            <div className="border-border/60 bg-surface/70 rounded-2xl border p-3">
              <p className="text-text-strong font-medium">Artifacts</p>
              <div className="mt-2 space-y-1">
                <InspectorRow
                  label="Output JSON"
                  value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts.outputPath ?? 'n/a'}
                />
                <InspectorRow
                  label="Listing HTML"
                  value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts.listing.htmlPath ?? 'n/a'}
                />
                <InspectorRow
                  label="Listing data"
                  value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts.listing.dataPath ?? 'n/a'}
                />
                <InspectorRow
                  label="Raw detail pages"
                  value={String(jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts.rawPages.count)}
                />
                <InspectorRow
                  label="Retention expires"
                  value={formatTimestamp(
                    jobSourcesPanel.diagnosticsQuery.data.diagnostics.artifacts.retentionExpiresAt,
                  )}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};

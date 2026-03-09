'use client';

import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';

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
  const formatTimestamp = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : 'n/a');

  return (
    <Card title="Worker integration" description="Trigger scrape runs and track worker lifecycle status.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobSourcesPanel.submit(event);
        }}
      >
        <div className="app-field-group">
          <Label htmlFor="scrape-mode" className="app-inline-label">
            Mode
          </Label>
          <select id="scrape-mode" className="app-select" {...register('mode')}>
            <option value="profile">Use profile-derived filters</option>
            <option value="custom">Use custom listing URL</option>
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
          {errors.listingUrl?.message ? <p className="text-app-danger text-sm">{errors.listingUrl.message}</p> : null}
        </div>

        <div className="app-field-group">
          <Label htmlFor="listing-limit" className="app-inline-label">
            Limit
          </Label>
          <Input id="listing-limit" type="number" min={1} max={100} {...register('limit')} />
          {errors.limit?.message ? <p className="text-app-danger text-sm">{errors.limit.message}</p> : null}
        </div>

        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? (
            <p className="text-app-warning text-sm">{disabledReason}</p>
          ) : preflight && !preflight.ready ? (
            <p className="text-app-warning text-sm">Resolve scrape blockers before enqueueing a run.</p>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={disabled || jobSourcesPanel.isSubmitting || Boolean(preflight && !preflight.ready)}>
            {jobSourcesPanel.isSubmitting ? 'Enqueuing...' : 'Enqueue scrape run'}
          </Button>
        </div>
      </form>

      {preflight ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-text-strong font-semibold">Preflight</p>
            <span className={preflight.ready ? 'text-app-success' : 'text-app-warning'}>
              {preflight.ready ? 'Ready to run' : 'Blocked'}
            </span>
          </div>
          <InspectorRow label="Source" value={preflight.source ?? 'n/a'} />
          <InspectorRow label="Listing URL" value={preflight.listingUrl ?? 'n/a'} />
          <InspectorRow label="Active runs" value={String(preflight.activeRunCount)} />
          <InspectorRow
            label="Daily remaining"
            value={preflight.dailyRemaining == null ? 'n/a' : String(preflight.dailyRemaining)}
          />
          {preflight.blockers.length ? (
            <div>
              <p className="text-text-strong font-medium">Blockers</p>
              <ul className="mt-2 space-y-1 text-app-warning">
                {preflight.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {preflight.warnings.length ? (
            <div>
              <p className="text-text-strong font-medium">Warnings</p>
              <ul className="mt-2 space-y-1 text-text-soft">
                {preflight.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
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
            <p className="text-text-strong text-sm font-semibold">Automation schedule</p>
            <p className="text-text-soft text-xs">Control cadence, next run visibility, and recovery-triggered manual sync.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...registerSchedule('enabled')} />
            Enabled
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-field-group">
            <Label htmlFor="schedule-cron" className="app-inline-label">
              Cron
            </Label>
            <Input id="schedule-cron" placeholder="0 9 * * *" {...registerSchedule('cron')} />
            {scheduleErrors.cron?.message ? <p className="text-app-danger text-sm">{scheduleErrors.cron.message}</p> : null}
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-timezone" className="app-inline-label">
              Timezone
            </Label>
            <Input id="schedule-timezone" placeholder="Europe/Warsaw" {...registerSchedule('timezone')} />
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
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-limit" className="app-inline-label">
              Limit
            </Label>
            <Input id="schedule-limit" type="number" min={1} max={100} {...registerSchedule('limit')} />
            {scheduleErrors.limit?.message ? <p className="text-app-danger text-sm">{scheduleErrors.limit.message}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InspectorRow label="Last result" value={jobSourcesPanel.scheduleResult?.lastRunStatus ?? 'n/a'} />
          <InspectorRow label="Last triggered" value={formatTimestamp(jobSourcesPanel.scheduleResult?.lastTriggeredAt)} />
          <InspectorRow label="Next run" value={formatTimestamp(jobSourcesPanel.scheduleResult?.nextRunAt)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-text-soft text-xs">Daily cron uses UTC on the backend. Use a timezone label for operator context.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={jobSourcesPanel.isSavingSchedule}>
              {jobSourcesPanel.isSavingSchedule ? 'Saving...' : 'Save schedule'}
            </Button>
            <Button
              type="button"
              disabled={!jobSourcesPanel.scheduleResult?.enabled || jobSourcesPanel.isTriggeringSchedule}
              onClick={() => jobSourcesPanel.triggerScheduleNow()}
            >
              {jobSourcesPanel.isTriggeringSchedule ? 'Triggering...' : 'Trigger now'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        <p className="text-text-strong text-sm font-semibold">Recent runs</p>
        {jobSourcesPanel.runsQuery.data?.items?.length ? (
          jobSourcesPanel.runsQuery.data.items.map((run) => (
            <article key={run.id} className="app-muted-panel space-y-3 text-sm">
              <InspectorRow label="Status" value={run.status} />
              <InspectorRow label="Scraped" value={String(run.scrapedCount ?? 0)} />
              <InspectorRow label="Found" value={String(run.totalFound ?? 0)} />
              <div className="mt-2">
                <Button type="button" variant="secondary" onClick={() => jobSourcesPanel.setSelectedRunId(run.id)}>
                  Show diagnostics
                </Button>
              </div>
              {run.error ? <p className="text-app-danger">{run.error}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-text-soft text-sm">No runs yet.</p>
        )}
      </div>

      {jobSourcesPanel.diagnosticsQuery.data ? (
        <div className="app-muted-panel mt-4 space-y-3 text-sm">
          <p className="text-text-strong font-semibold">Run diagnostics</p>
          <InspectorRow label="Run id" value={jobSourcesPanel.diagnosticsQuery.data.runId} />
          <InspectorRow label="Status" value={jobSourcesPanel.diagnosticsQuery.data.status} />
          <InspectorRow
            label="Pages visited"
            value={String(jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.pagesVisited)}
          />
          <InspectorRow
            label="Job links discovered"
            value={String(jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.jobLinksDiscovered)}
          />
          <InspectorRow
            label="Blocked pages"
            value={String(jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.blockedPages)}
          />
          <InspectorRow
            label="Ignored recommended links"
            value={String(jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.ignoredRecommendedLinks)}
          />
          <InspectorRow
            label="Zero-offers step observed"
            value={jobSourcesPanel.diagnosticsQuery.data.diagnostics.hadZeroOffersStep ? 'yes' : 'no'}
          />
        </div>
      ) : null}
    </Card>
  );
};

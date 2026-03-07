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
          {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : <span />}
          <Button type="submit" disabled={disabled || jobSourcesPanel.isSubmitting}>
            {jobSourcesPanel.isSubmitting ? 'Enqueuing...' : 'Enqueue scrape run'}
          </Button>
        </div>
      </form>

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

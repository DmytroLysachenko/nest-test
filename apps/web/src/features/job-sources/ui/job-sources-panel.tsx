'use client';

import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
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
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobSourcesPanel.submit(event);
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="scrape-mode">Mode</Label>
          <select
            id="scrape-mode"
            className="border-border bg-surface-elevated h-10 rounded-md border px-3 text-sm"
            {...register('mode')}
          >
            <option value="profile">Use profile-derived filters</option>
            <option value="custom">Use custom listing URL</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="listing-url">Listing URL</Label>
          <Input
            id="listing-url"
            placeholder="https://it.pracuj.pl/praca?..."
            disabled={jobSourcesPanel.mode !== 'custom'}
            {...register('listingUrl')}
          />
          {errors.listingUrl?.message ? <p className="text-app-danger text-sm">{errors.listingUrl.message}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="listing-limit">Limit</Label>
          <Input id="listing-limit" type="number" min={1} max={100} {...register('limit')} />
          {errors.limit?.message ? <p className="text-app-danger text-sm">{errors.limit.message}</p> : null}
        </div>

        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || jobSourcesPanel.isSubmitting}>
          {jobSourcesPanel.isSubmitting ? 'Enqueuing...' : 'Enqueue scrape run'}
        </Button>
        {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : null}
      </form>

      {jobSourcesPanel.enqueueResult ? (
        <div className="border-border bg-surface-muted text-text-soft mt-4 rounded-md border p-3 text-sm">
          <p className="text-text-strong font-semibold">Latest enqueue metadata</p>
          <p>Status: {jobSourcesPanel.enqueueResult.status}</p>
          {jobSourcesPanel.enqueueResult.resolvedFromProfile ? <p>Resolved from active profile: yes</p> : null}
          {jobSourcesPanel.enqueueResult.intentFingerprint ? (
            <p>Intent fingerprint: {jobSourcesPanel.enqueueResult.intentFingerprint}</p>
          ) : null}
          {jobSourcesPanel.enqueueResult.acceptedFilters ? (
            <details className="mt-2">
              <summary className="text-text-strong cursor-pointer font-medium">Accepted filters</summary>
              <pre className="bg-surface-elevated mt-2 whitespace-pre-wrap rounded-md p-2 text-xs">
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
            <article key={run.id} className="border-border bg-surface-muted rounded-md border p-3 text-sm">
              <p className="text-text-strong font-medium">Status: {run.status}</p>
              <p className="text-text-soft">Scraped: {run.scrapedCount ?? 0}</p>
              <p className="text-text-soft">Found: {run.totalFound ?? 0}</p>
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
        <div className="border-border bg-surface-muted text-text-soft mt-4 rounded-md border p-3 text-sm">
          <p className="text-text-strong font-semibold">Run diagnostics</p>
          <p>Run id: {jobSourcesPanel.diagnosticsQuery.data.runId}</p>
          <p>Status: {jobSourcesPanel.diagnosticsQuery.data.status}</p>
          <p>Pages visited: {jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.pagesVisited}</p>
          <p>Job links discovered: {jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.jobLinksDiscovered}</p>
          <p>Blocked pages: {jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.blockedPages}</p>
          <p>
            Ignored recommended links: {jobSourcesPanel.diagnosticsQuery.data.diagnostics.stats.ignoredRecommendedLinks}
          </p>
          <p>
            Zero-offers step observed:{' '}
            {jobSourcesPanel.diagnosticsQuery.data.diagnostics.hadZeroOffersStep ? 'yes' : 'no'}
          </p>
        </div>
      ) : null}
    </Card>
  );
};

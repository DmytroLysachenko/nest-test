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
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
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
          {errors.listingUrl?.message ? <p className="text-sm text-rose-600">{errors.listingUrl.message}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="listing-limit">Limit</Label>
          <Input id="listing-limit" type="number" min={1} max={100} {...register('limit')} />
          {errors.limit?.message ? <p className="text-sm text-rose-600">{errors.limit.message}</p> : null}
        </div>

        {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || jobSourcesPanel.isSubmitting}>
          {jobSourcesPanel.isSubmitting ? 'Enqueuing...' : 'Enqueue scrape run'}
        </Button>
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
      </form>

      {jobSourcesPanel.enqueueResult ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Latest enqueue metadata</p>
          <p>Status: {jobSourcesPanel.enqueueResult.status}</p>
          {jobSourcesPanel.enqueueResult.resolvedFromProfile ? <p>Resolved from active profile: yes</p> : null}
          {jobSourcesPanel.enqueueResult.intentFingerprint ? (
            <p>Intent fingerprint: {jobSourcesPanel.enqueueResult.intentFingerprint}</p>
          ) : null}
          {jobSourcesPanel.enqueueResult.acceptedFilters ? (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-slate-800">Accepted filters</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs">
                {JSON.stringify(jobSourcesPanel.enqueueResult.acceptedFilters, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Recent runs</p>
        {jobSourcesPanel.runsQuery.data?.items?.length ? (
          jobSourcesPanel.runsQuery.data.items.map((run) => (
            <article key={run.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">Status: {run.status}</p>
              <p className="text-slate-600">Scraped: {run.scrapedCount ?? 0}</p>
              <p className="text-slate-600">Found: {run.totalFound ?? 0}</p>
              {run.error ? <p className="text-rose-600">{run.error}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No runs yet.</p>
        )}
      </div>
    </Card>
  );
};

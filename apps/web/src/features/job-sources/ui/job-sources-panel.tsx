'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Label } from '@repo/ui/components/label';

import { enqueueScrape, listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

type JobSourcesPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

const DEFAULT_LISTING_URL = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend';

export const JobSourcesPanel = ({ token, disabled = false, disabledReason }: JobSourcesPanelProps) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'profile' | 'custom'>('profile');
  const [listingUrl, setListingUrl] = useState(DEFAULT_LISTING_URL);
  const [limit, setLimit] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ['job-sources', 'runs', token],
    queryFn: () => listJobSourceRuns(token),
    refetchInterval: 15000,
  });

  const enqueueMutation = useMutation({
    mutationFn: () =>
      enqueueScrape(token, {
        listingUrl: mode === 'custom' ? listingUrl : undefined,
        limit: Number(limit),
        source: mode === 'custom' ? 'pracuj-pl' : undefined,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['job-sources', 'runs', token] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Failed to enqueue scrape');
    },
  });

  return (
    <Card title="Worker integration" description="Trigger scrape runs and track worker lifecycle status.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          setError(null);
          enqueueMutation.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="scrape-mode">Mode</Label>
          <select
            id="scrape-mode"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={mode}
            onChange={(event) => setMode(event.target.value as 'profile' | 'custom')}
          >
            <option value="profile">Use profile-derived filters</option>
            <option value="custom">Use custom listing URL</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="listing-url">Listing URL</Label>
          <Input
            id="listing-url"
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
            placeholder="https://it.pracuj.pl/praca?..."
            required={mode === 'custom'}
            disabled={mode !== 'custom'}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="listing-limit">Limit</Label>
          <Input
            id="listing-limit"
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={disabled || enqueueMutation.isPending}>
          {enqueueMutation.isPending ? 'Enqueuing...' : 'Enqueue scrape run'}
        </Button>
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
      </form>

      {enqueueMutation.data ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Latest enqueue metadata</p>
          <p>Status: {enqueueMutation.data.status}</p>
          {enqueueMutation.data.resolvedFromProfile ? <p>Resolved from active profile: yes</p> : null}
          {enqueueMutation.data.intentFingerprint ? (
            <p>Intent fingerprint: {enqueueMutation.data.intentFingerprint}</p>
          ) : null}
          {enqueueMutation.data.acceptedFilters ? (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-slate-800">Accepted filters</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs">
                {JSON.stringify(enqueueMutation.data.acceptedFilters, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Recent runs</p>
        {runsQuery.data?.items?.length ? (
          runsQuery.data.items.map((run) => (
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

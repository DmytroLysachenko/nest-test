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
};

const DEFAULT_LISTING_URL = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend';

export const JobSourcesPanel = ({ token }: JobSourcesPanelProps) => {
  const queryClient = useQueryClient();
  const [listingUrl, setListingUrl] = useState(DEFAULT_LISTING_URL);
  const [limit, setLimit] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ['job-sources', 'runs', token],
    queryFn: () => listJobSourceRuns(token),
  });

  const enqueueMutation = useMutation({
    mutationFn: () =>
      enqueueScrape(token, {
        listingUrl,
        limit: Number(limit),
        source: 'pracuj-pl',
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
          setError(null);
          enqueueMutation.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="listing-url">Listing URL</Label>
          <Input
            id="listing-url"
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
            placeholder="https://it.pracuj.pl/praca?..."
            required
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
        <Button type="submit" disabled={enqueueMutation.isPending}>
          {enqueueMutation.isPending ? 'Enqueuing...' : 'Enqueue scrape run'}
        </Button>
      </form>

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

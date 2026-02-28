'use client';

import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';

import type { JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'];

type NotebookFiltersCardProps = {
  status: 'ALL' | JobOfferStatus;
  mode: 'strict' | 'approx' | 'explore';
  hasScore: 'all' | 'yes' | 'no';
  tag: string;
  search: string;
  onStatusChange: (value: 'ALL' | JobOfferStatus) => void;
  onModeChange: (value: 'strict' | 'approx' | 'explore') => void;
  onHasScoreChange: (value: 'all' | 'yes' | 'no') => void;
  onTagChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  total: number;
  isEnqueueingScrape: boolean;
  onEnqueueProfileScrape: () => void;
  enqueueStatus: string | null;
};

export const NotebookFiltersCard = ({
  status,
  mode,
  hasScore,
  tag,
  search,
  onStatusChange,
  onModeChange,
  onHasScoreChange,
  onTagChange,
  onSearchChange,
  total,
  isEnqueueingScrape,
  onEnqueueProfileScrape,
  enqueueStatus,
}: NotebookFiltersCardProps) => (
  <Card
    title="Job Notebook"
    description="Review scraped offers, update workflow status, manage notes/tags, and inspect scoring output."
  >
    <div className="grid gap-3 md:grid-cols-6">
      <div className="space-y-1">
        <Label htmlFor="notebook-status">Status</Label>
        <select
          id="notebook-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as 'ALL' | JobOfferStatus)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="ALL">ALL</option>
          {STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notebook-mode">Mode</Label>
        <select
          id="notebook-mode"
          value={mode}
          onChange={(event) => onModeChange(event.target.value as 'strict' | 'approx' | 'explore')}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="strict">strict</option>
          <option value="approx">approx</option>
          <option value="explore">explore</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notebook-has-score">Has score</Label>
        <select
          id="notebook-has-score"
          value={hasScore}
          onChange={(event) => onHasScoreChange(event.target.value as 'all' | 'yes' | 'no')}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">all</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notebook-tag">Tag</Label>
        <Input
          id="notebook-tag"
          value={tag}
          onChange={(event) => onTagChange(event.target.value)}
          placeholder="backend"
        />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="notebook-search">Search notes/tags</Label>
        <Input
          id="notebook-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="nestjs"
        />
      </div>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <p className="text-xs text-slate-500">Total: {total}</p>
      <Button type="button" variant="secondary" onClick={onEnqueueProfileScrape} disabled={isEnqueueingScrape}>
        {isEnqueueingScrape ? 'Enqueuing scrape...' : 'Enqueue profile scrape'}
      </Button>
      {enqueueStatus ? <p className="text-xs text-slate-600">{enqueueStatus}</p> : null}
    </div>
  </Card>
);

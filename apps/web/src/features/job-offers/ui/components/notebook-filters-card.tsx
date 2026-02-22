'use client';

import { Label } from '@repo/ui/components/label';

import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

import type { JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'];

type NotebookFiltersCardProps = {
  status: 'ALL' | JobOfferStatus;
  hasScore: 'all' | 'yes' | 'no';
  tag: string;
  search: string;
  onStatusChange: (value: 'ALL' | JobOfferStatus) => void;
  onHasScoreChange: (value: 'all' | 'yes' | 'no') => void;
  onTagChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  total: number;
};

export const NotebookFiltersCard = ({
  status,
  hasScore,
  tag,
  search,
  onStatusChange,
  onHasScoreChange,
  onTagChange,
  onSearchChange,
  total,
}: NotebookFiltersCardProps) => (
  <Card
    title="Job Notebook"
    description="Review scraped offers, update workflow status, manage notes/tags, and inspect scoring output."
  >
    <div className="grid gap-3 md:grid-cols-5">
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

    <p className="mt-3 text-xs text-slate-500">Total: {total}</p>
  </Card>
);

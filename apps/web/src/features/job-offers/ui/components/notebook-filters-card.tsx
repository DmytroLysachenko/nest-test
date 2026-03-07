'use client';

import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { FilterChipBar } from '@/shared/ui/filter-chip-bar';

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
  onResetFilters: () => void;
  onSavePreset: () => void;
  onApplyPreset: () => void;
  hasSavedPreset: boolean;
  activeFilters: Array<{
    key: string;
    label: string;
    onClear: () => void;
  }>;
  total: number;
  listUpdatedAt: number | null | undefined;
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
  onResetFilters,
  onSavePreset,
  onApplyPreset,
  hasSavedPreset,
  activeFilters,
  total,
  listUpdatedAt,
  isEnqueueingScrape,
  onEnqueueProfileScrape,
  enqueueStatus,
}: NotebookFiltersCardProps) => (
  <Card
    title="Job Notebook"
    description="Review scraped offers, update workflow status, manage notes/tags, and inspect scoring output."
  >
    <div className="app-toolbar mb-4 flex flex-wrap items-center gap-2">
      <span className="app-badge">Total offers: {total}</span>
      <DataFreshnessBadge updatedAt={listUpdatedAt} label="Results" />
      <div className="ml-auto flex flex-wrap gap-2">
        <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={onResetFilters}>
          Reset filters
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={onSavePreset}>
          Save preset
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={onApplyPreset}
          disabled={!hasSavedPreset}
        >
          Apply preset
        </Button>
      </div>
    </div>

    <FilterChipBar items={activeFilters} onResetAll={onResetFilters} />

    <div className="grid gap-3 md:grid-cols-6">
      <div className="app-field-group">
        <Label htmlFor="notebook-status" className="app-inline-label">
          Status
        </Label>
        <select
          id="notebook-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as 'ALL' | JobOfferStatus)}
          className="app-select"
        >
          <option value="ALL">ALL</option>
          {STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>
      </div>

      <div className="app-field-group">
        <Label htmlFor="notebook-mode" className="app-inline-label">
          Mode
        </Label>
        <select
          id="notebook-mode"
          value={mode}
          onChange={(event) => onModeChange(event.target.value as 'strict' | 'approx' | 'explore')}
          className="app-select"
        >
          <option value="strict">strict</option>
          <option value="approx">approx</option>
          <option value="explore">explore</option>
        </select>
      </div>

      <div className="app-field-group">
        <Label htmlFor="notebook-has-score" className="app-inline-label">
          Has score
        </Label>
        <select
          id="notebook-has-score"
          value={hasScore}
          onChange={(event) => onHasScoreChange(event.target.value as 'all' | 'yes' | 'no')}
          className="app-select"
        >
          <option value="all">all</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </div>

      <div className="app-field-group">
        <Label htmlFor="notebook-tag" className="app-inline-label">
          Tag
        </Label>
        <Input
          id="notebook-tag"
          value={tag}
          onChange={(event) => onTagChange(event.target.value)}
          placeholder="backend"
        />
      </div>

      <div className="app-field-group md:col-span-2">
        <Label htmlFor="notebook-search" className="app-inline-label">
          Search notes/tags
        </Label>
        <Input
          id="notebook-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="nestjs"
        />
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={onEnqueueProfileScrape} disabled={isEnqueueingScrape}>
        {isEnqueueingScrape ? 'Enqueuing scrape...' : 'Enqueue profile scrape'}
      </Button>
      {enqueueStatus ? <p className="text-secondary-foreground text-xs">{enqueueStatus}</p> : null}
      <p className="text-text-soft ml-auto text-xs">Shortcuts: S save, D dismiss, M seen, A applied.</p>
    </div>
  </Card>
);

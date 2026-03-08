'use client';

import { Trash2, Archive, Sparkles } from 'lucide-react';

import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { FilterChipBar } from '@/shared/ui/filter-chip-bar';

import type { JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = [
  'NEW',
  'SEEN',
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
  'DISMISSED',
];

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
  activeFilters: Array<{ key: string; label: string; onClear: () => void }>;
  total: number;
  listUpdatedAt: number | null | undefined;
  onEnqueueProfileScrape: () => void;
  enqueueStatus: 'idle' | 'pending' | 'success' | 'error';
  onDismissAllSeen?: () => void;
  onAutoArchive?: () => void;
  isBusy?: boolean;
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
  onEnqueueProfileScrape,
  enqueueStatus,
  onDismissAllSeen,
  onAutoArchive,
  isBusy,
}: NotebookFiltersCardProps) => (
  <Card title="Filters & Tools" description="Refine offer list or trigger background maintenance.">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="app-field-group">
        <Label className="app-inline-label">Status</Label>
        <select
          className="app-select"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'ALL' | JobOfferStatus)}
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="app-field-group">
        <Label className="app-inline-label">Mode</Label>
        <select
          className="app-select"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as 'strict' | 'approx' | 'explore')}
        >
          <option value="strict">Strict (Grounding check)</option>
          <option value="approx">Approximate (Relaxed constraints)</option>
          <option value="explore">Explore (Global discovery)</option>
        </select>
      </div>

      <div className="app-field-group">
        <Label className="app-inline-label">Scoring</Label>
        <select
          className="app-select"
          value={hasScore}
          onChange={(e) => onHasScoreChange(e.target.value as 'all' | 'yes' | 'no')}
        >
          <option value="all">All offers</option>
          <option value="yes">Only scored</option>
          <option value="no">Only unscored</option>
        </select>
      </div>

      <div className="app-field-group">
        <Label className="app-inline-label" htmlFor="filter-tag">
          Tag
        </Label>
        <Input
          id="filter-tag"
          placeholder="e.g. backend"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="app-field-group lg:col-span-2">
        <Label className="app-inline-label" htmlFor="filter-search">
          Search in notes/tags
        </Label>
        <Input
          id="filter-search"
          placeholder="Keywords..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10"
        />
      </div>
    </div>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={onResetFilters} className="h-9 px-4">
          Reset all
        </Button>
        <Button type="button" variant="secondary" onClick={onSavePreset} className="h-9 px-4">
          Save as default
        </Button>
        {hasSavedPreset ? (
          <Button type="button" variant="secondary" onClick={onApplyPreset} className="h-9 px-4">
            Load default
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-text-strong text-sm font-semibold">{total} matches</p>
          <DataFreshnessBadge updatedAt={listUpdatedAt} />
        </div>
      </div>
    </div>

    {activeFilters.length > 0 ? (
      <div className="border-border/40 mt-4 border-t pt-4">
        <FilterChipBar items={activeFilters} />
      </div>
    ) : null}

    <div className="border-border/40 mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isBusy || enqueueStatus === 'pending'}
        onClick={onEnqueueProfileScrape}
        className="border-primary/20 hover:bg-primary/5 hover:text-primary h-8 transition-colors"
      >
        <Sparkles className="text-app-warning mr-2 h-3.5 w-3.5" />
        {enqueueStatus === 'pending' ? 'Enqueueing...' : 'Sync via Profile'}
      </Button>

      {onDismissAllSeen && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={onDismissAllSeen}
          className="hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 h-8"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Dismiss all SEEN
        </Button>
      )}

      {onAutoArchive && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={onAutoArchive}
          className="hover:bg-primary/5 hover:border-primary/20 h-8"
        >
          <Archive className="mr-2 h-3.5 w-3.5" />
          Auto-Archive Old
        </Button>
      )}

      <p className="text-text-soft ml-auto text-xs">Shortcuts: S save, D dismiss, M seen, A applied.</p>
    </div>
  </Card>
);

'use client';

import { Trash2, Archive, Sparkles } from 'lucide-react';

import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { FilterChipBar } from '@/shared/ui/filter-chip-bar';

import type { JobOfferStatus, JobOfferSummaryDto } from '@/shared/types/api';

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

const PIPELINE_STATUSES: JobOfferStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'ARCHIVED'];

type NotebookQuickAction =
  | 'unscored'
  | 'strictTop'
  | 'saved'
  | 'applied'
  | 'staleUntriaged'
  | 'followUpDue'
  | 'followUpUpcoming'
  | 'missingNextStep'
  | 'stalePipeline';

type NotebookFiltersCardProps = {
  variant?: 'triage' | 'pipeline';
  status: 'ALL' | JobOfferStatus;
  mode: 'strict' | 'approx' | 'explore';
  hasScore: 'all' | 'yes' | 'no';
  followUp: 'all' | 'due' | 'upcoming' | 'none';
  tag: string;
  search: string;
  onStatusChange: (value: 'ALL' | JobOfferStatus) => void;
  onModeChange: (value: 'strict' | 'approx' | 'explore') => void;
  onHasScoreChange: (value: 'all' | 'yes' | 'no') => void;
  onFollowUpChange: (value: 'all' | 'due' | 'upcoming' | 'none') => void;
  onTagChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  onSavePreset: () => void;
  onApplyPreset: () => void;
  hasSavedPreset: boolean;
  activeFilters: Array<{ key: string; label: string; onClear: () => void }>;
  total: number;
  hiddenByModeCount?: number;
  listUpdatedAt: number | null | undefined;
  onEnqueueProfileScrape: () => void;
  enqueueStatus: 'idle' | 'pending' | 'success' | 'error';
  onDismissAllSeen?: () => void;
  onAutoArchive?: () => void;
  isBusy?: boolean;
  summary?: JobOfferSummaryDto | null;
  onQuickAction?: (action: NotebookQuickAction) => void;
};

export const NotebookFiltersCard = ({
  variant = 'triage',
  status,
  mode,
  hasScore,
  followUp,
  tag,
  search,
  onStatusChange,
  onModeChange,
  onHasScoreChange,
  onFollowUpChange,
  onTagChange,
  onSearchChange,
  onResetFilters,
  onSavePreset,
  onApplyPreset,
  hasSavedPreset,
  activeFilters,
  total,
  hiddenByModeCount = 0,
  listUpdatedAt,
  onEnqueueProfileScrape,
  enqueueStatus,
  onDismissAllSeen,
  onAutoArchive,
  isBusy,
  summary,
  onQuickAction,
}: NotebookFiltersCardProps) => {
  const isPipeline = variant === 'pipeline';
  const visibleStatuses = isPipeline ? PIPELINE_STATUSES : STATUSES;
  const quickActionMap: Partial<Record<string, NotebookQuickAction>> = {
    unscored: 'unscored',
    'strict-top': 'strictTop',
    saved: 'saved',
    applied: 'applied',
    'stale-untriaged': 'staleUntriaged',
    'follow-up-due': 'followUpDue',
    'follow-up-upcoming': 'followUpUpcoming',
    'missing-next-step': 'missingNextStep',
    'stale-pipeline': 'stalePipeline',
  };
  const visibleQuickActionKeys = isPipeline
    ? new Set(['saved', 'applied', 'follow-up-due', 'follow-up-upcoming', 'missing-next-step', 'stale-pipeline'])
    : new Set(['strict-top', 'unscored', 'stale-untriaged']);

  return (
    <Card
      title={isPipeline ? 'Pipeline controls' : 'Notebook controls'}
      description={
        isPipeline
          ? 'Filter active applications, surface stale work, and keep follow-ups visible without leaving the board.'
          : 'Tune the triage slice and run notebook maintenance without leaving this workspace.'
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className={`grid gap-4 ${isPipeline ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          <div className="app-field-group">
            <Label className="app-inline-label" htmlFor="filter-status">
              Status
            </Label>
            <select
              id="filter-status"
              className="app-select"
              value={status}
              onChange={(e) => onStatusChange(e.target.value as 'ALL' | JobOfferStatus)}
            >
              <option value="ALL">All statuses</option>
              {visibleStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {!isPipeline ? (
            <div className="app-field-group">
              <Label className="app-inline-label" htmlFor="filter-mode">
                Mode
              </Label>
              <select
                id="filter-mode"
                className="app-select"
                value={mode}
                onChange={(e) => onModeChange(e.target.value as 'strict' | 'approx' | 'explore')}
              >
                <option value="strict">Strict (Grounding check)</option>
                <option value="approx">Approximate (Relaxed constraints)</option>
                <option value="explore">Explore (Global discovery)</option>
              </select>
            </div>
          ) : null}

          {!isPipeline ? (
            <div className="app-field-group">
              <Label className="app-inline-label" htmlFor="filter-scoring">
                Scoring
              </Label>
              <select
                id="filter-scoring"
                className="app-select"
                value={hasScore}
                onChange={(e) => onHasScoreChange(e.target.value as 'all' | 'yes' | 'no')}
              >
                <option value="all">All offers</option>
                <option value="yes">Only scored</option>
                <option value="no">Only unscored</option>
              </select>
            </div>
          ) : null}

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

          <div className="app-field-group">
            <Label className="app-inline-label" htmlFor="filter-follow-up">
              Follow-up
            </Label>
            <select
              id="filter-follow-up"
              className="app-select"
              value={followUp}
              onChange={(e) => onFollowUpChange(e.target.value as 'all' | 'due' | 'upcoming' | 'none')}
            >
              <option value="all">All offers</option>
              <option value="due">Follow-up due</option>
              <option value="upcoming">Follow-up upcoming</option>
              <option value="none">No follow-up scheduled</option>
            </select>
          </div>

          <div className="app-field-group lg:col-span-2">
            <Label className="app-inline-label" htmlFor="filter-search">
              {isPipeline ? 'Search in titles, notes, and tags' : 'Search in notes/tags'}
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

        <div className="app-utility-rail space-y-4">
          <div className="app-inset-stack">
            <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Current slice</p>
            <p className="text-text-strong mt-2 text-2xl font-semibold tracking-[-0.03em]">{total}</p>
            <p className="text-text-soft mt-1 text-sm">
              {isPipeline ? 'roles in the active application workspace' : 'offers in the active triage view'}
            </p>
            {!isPipeline && mode === 'strict' && hiddenByModeCount > 0 ? (
              <p className="text-app-warning mt-2 text-xs">{hiddenByModeCount} hidden by strict mode</p>
            ) : null}
            <div className="mt-3">
              <DataFreshnessBadge updatedAt={listUpdatedAt} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="border-border/40 mt-4 border-t pt-4">
          <FilterChipBar items={activeFilters} />
        </div>
      ) : null}

      {summary ? (
        <div className="border-border/40 mt-4 space-y-3 border-t pt-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {!isPipeline ? (
              <>
                <div className="app-muted-panel">
                  <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Unscored</p>
                  <p className="text-text-strong mt-1 text-2xl font-semibold">{summary.unscored}</p>
                </div>
                <div className="app-muted-panel">
                  <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Strict top matches</p>
                  <p className="text-text-strong mt-1 text-2xl font-semibold">{summary.highConfidenceStrict}</p>
                </div>
              </>
            ) : (
              <>
                <div className="app-muted-panel">
                  <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Saved</p>
                  <p className="text-text-strong mt-1 text-2xl font-semibold">
                    {summary.buckets.find((bucket) => bucket.key === 'saved')?.count ?? 0}
                  </p>
                </div>
                <div className="app-muted-panel">
                  <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Applied</p>
                  <p className="text-text-strong mt-1 text-2xl font-semibold">
                    {summary.buckets.find((bucket) => bucket.key === 'applied')?.count ?? 0}
                  </p>
                </div>
              </>
            )}
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Saved follow-ups</p>
              <p className="text-text-strong mt-1 text-2xl font-semibold">
                {summary.buckets.find((bucket) => bucket.key === 'saved')?.count ?? 0}
              </p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">
                {isPipeline ? 'Missing next step' : 'Stale untriaged'}
              </p>
              <p className="text-text-strong mt-1 text-2xl font-semibold">
                {isPipeline ? summary.missingNextStep : summary.staleUntriaged}
              </p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Follow-up due</p>
              <p className="text-text-strong mt-1 text-2xl font-semibold">{summary.followUpDue}</p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">
                {isPipeline ? 'Stale pipeline' : 'Follow-up upcoming'}
              </p>
              <p className="text-text-strong mt-1 text-2xl font-semibold">
                {isPipeline ? summary.stalePipeline : summary.followUpUpcoming}
              </p>
            </div>
          </div>

          {onQuickAction ? (
            <div className="flex flex-wrap gap-2">
              {summary.quickActions
                .filter((action) => visibleQuickActionKeys.has(action.key))
                .map((action) => (
                  <Button
                    key={action.key}
                    type="button"
                    variant="secondary"
                    className="h-8 px-3"
                    onClick={() => {
                      const mapped = quickActionMap[action.key];
                      if (mapped) {
                        onQuickAction(mapped);
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
            </div>
          ) : null}

          {!isPipeline && summary.topExplanationTags.length ? (
            <div className="flex flex-wrap gap-2">
              {summary.topExplanationTags.map((tagItem) => (
                <span key={tagItem.tag} className="bg-surface-muted text-text-soft rounded-full px-3 py-1 text-xs">
                  {tagItem.tag} ({tagItem.count})
                </span>
              ))}
            </div>
          ) : null}
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

        {onDismissAllSeen && !isPipeline ? (
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
        ) : null}

        {onAutoArchive ? (
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
        ) : null}

        <p className="text-text-soft ml-auto text-xs">
          {isPipeline ? 'Use the board arrows to move roles forward or backward instantly.' : 'Shortcuts: S save, D dismiss, M seen, A applied.'}
        </p>
      </div>
    </Card>
  );
};

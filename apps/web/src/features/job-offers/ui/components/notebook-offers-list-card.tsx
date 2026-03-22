'use client';

import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type NotebookOffersListCardProps = {
  offers: JobOfferListItemDto[];
  hiddenByModeCount: number;
  selectedId: string | null;
  selectedOfferIds: string[];
  isBusy: boolean;
  offset: number;
  canPrev: boolean;
  canNext: boolean;
  isAllVisibleSelected: boolean;
  mode: 'strict' | 'approx' | 'explore';
  onSelectOffer: (id: string) => void;
  onToggleOfferSelection: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelected: () => void;
  onBulkStatusChange: (status: JobOfferStatus) => void;
  onBulkFollowUpSave: (payload: {
    ids: string[];
    followUpAt: string | null;
    nextStep?: string | null;
    note?: string | null;
  }) => void;
  onPrev: () => void;
  onNext: () => void;
};

export const NotebookOffersListCard = ({
  offers,
  hiddenByModeCount,
  selectedId,
  selectedOfferIds,
  isBusy,
  offset,
  canPrev,
  canNext,
  isAllVisibleSelected,
  mode,
  onSelectOffer,
  onToggleOfferSelection,
  onSelectAllVisible,
  onClearSelected,
  onBulkStatusChange,
  onBulkFollowUpSave,
  onPrev,
  onNext,
}: NotebookOffersListCardProps) => {
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState('');
  const [bulkNextStep, setBulkNextStep] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const canSaveBulkFollowUp = useMemo(
    () =>
      selectedOfferIds.length > 0 &&
      (bulkFollowUpAt.trim().length > 0 || bulkNextStep.trim().length > 0 || bulkNote.trim().length > 0),
    [bulkFollowUpAt, bulkNextStep, bulkNote, selectedOfferIds.length],
  );
  const getFollowUpTone = (followUpState?: JobOfferListItemDto['followUpState']) => {
    if (followUpState === 'due') {
      return 'border-app-danger-border bg-app-danger-soft text-app-danger';
    }
    if (followUpState === 'upcoming') {
      return 'border-app-warning-border bg-app-warning-soft text-app-warning';
    }
    return '';
  };
  const getPipelineValue = (offer: JobOfferListItemDto, key: 'nextStep' | 'followUpNote') => {
    const value = offer.pipelineMeta?.[key];
    return typeof value === 'string' ? value.trim() : '';
  };

  return (
    <Card title="Offers" description="Filtered notebook results">
      <div className="app-toolbar mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={onSelectAllVisible}>
          {isAllVisibleSelected ? 'Unselect visible' : 'Select visible'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={onClearSelected}
          disabled={!selectedOfferIds.length}
        >
          Clear selection
        </Button>
        <span className="app-badge">{selectedOfferIds.length} selected</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={!selectedOfferIds.length || isBusy}
            onClick={() => onBulkStatusChange('SAVED')}
          >
            Bulk Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={!selectedOfferIds.length || isBusy}
            onClick={() => onBulkStatusChange('DISMISSED')}
          >
            Bulk Dismiss
          </Button>
        </div>
      </div>

      <div className="app-muted-panel mb-4 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div className="app-field-group">
            <Label htmlFor="bulk-follow-up-at" className="app-inline-label">
              Bulk follow-up date
            </Label>
            <Input
              id="bulk-follow-up-at"
              type="datetime-local"
              value={bulkFollowUpAt}
              onChange={(event) => setBulkFollowUpAt(event.target.value)}
            />
          </div>
          <div className="app-field-group">
            <Label htmlFor="bulk-next-step" className="app-inline-label">
              Bulk next step
            </Label>
            <Input
              id="bulk-next-step"
              value={bulkNextStep}
              placeholder="Send follow-up email"
              onChange={(event) => setBulkNextStep(event.target.value)}
            />
          </div>
          <div className="app-field-group">
            <Label htmlFor="bulk-follow-up-note" className="app-inline-label">
              Bulk follow-up note
            </Label>
            <Input
              id="bulk-follow-up-note"
              value={bulkNote}
              placeholder="Mention updated portfolio or interview availability"
              onChange={(event) => setBulkNote(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="h-10"
            disabled={!canSaveBulkFollowUp || isBusy}
            onClick={() => {
              onBulkFollowUpSave({
                ids: selectedOfferIds,
                followUpAt: bulkFollowUpAt ? new Date(bulkFollowUpAt).toISOString() : null,
                nextStep: bulkNextStep.trim() || null,
                note: bulkNote.trim() || null,
              });
              setBulkFollowUpAt('');
              setBulkNextStep('');
              setBulkNote('');
            }}
          >
            Save bulk follow-up
          </Button>
        </div>
        <p className="text-text-soft text-xs">
          Apply one follow-up date, next step, or note across the current selection without opening each offer.
        </p>
      </div>

      <div className="space-y-2">
        {offers.length ? (
          offers.map((offer) => (
            <article
              key={offer.id}
              className={`w-full rounded-[1.35rem] border p-4 text-left text-sm transition-all duration-200 ${
                selectedId === offer.id
                  ? 'border-primary/50 bg-primary/5 shadow-[0_12px_32px_-16px_color-mix(in_oklab,var(--primary)_20%,transparent)]'
                  : 'border-border/60 bg-surface/80 hover:border-primary/30 hover:bg-surface-elevated/95 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--text-strong)_10%,transparent)]'
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedOfferIds.includes(offer.id)}
                  onChange={() => onToggleOfferSelection(offer.id)}
                  className="border-border mt-1 h-4 w-4 rounded"
                  aria-label={`Select ${offer.title}`}
                />
                <button type="button" onClick={() => onSelectOffer(offer.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-semibold tracking-[-0.02em]">{offer.title}</p>
                      <p className="text-secondary-foreground mt-1">{offer.company ?? 'Unknown company'}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{offer.location ?? 'Unknown location'}</p>
                    </div>
                    <span className="app-badge">status: {offer.status}</span>
                  </div>
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="app-badge">score: {offer.matchScore ?? 'n/a'}</span>
                {offer.rankingScore !== undefined ? (
                  <span className="app-badge">rank: {offer.rankingScore}</span>
                ) : null}
                {offer.followUpState && offer.followUpState !== 'none' ? (
                  <span className={`app-badge ${getFollowUpTone(offer.followUpState)}`}>
                    follow-up: {offer.followUpState}
                  </span>
                ) : null}
                {offer.sourceRunId ? <span className="app-badge">run: {offer.sourceRunId.slice(0, 8)}</span> : null}
                {(offer.explanationTags ?? []).slice(0, 3).map((tag) => (
                  <span key={tag} className="app-badge">
                    {tag}
                  </span>
                ))}
              </div>
              {(getPipelineValue(offer, 'nextStep') || getPipelineValue(offer, 'followUpNote')) && (
                <div className="border-border/50 bg-surface-muted/60 mt-3 rounded-2xl border px-3 py-2.5 text-xs">
                  {getPipelineValue(offer, 'nextStep') ? (
                    <p className="text-text-strong font-medium">Next step: {getPipelineValue(offer, 'nextStep')}</p>
                  ) : null}
                  {getPipelineValue(offer, 'followUpNote') ? (
                    <p className="text-text-soft mt-1 line-clamp-2">{getPipelineValue(offer, 'followUpNote')}</p>
                  ) : null}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="space-y-3">
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title={mode === 'strict' && hiddenByModeCount > 0 ? 'Offers hidden by strict mode' : 'No offers found'}
              description={
                mode === 'strict' && hiddenByModeCount > 0
                  ? `${hiddenByModeCount} offer${hiddenByModeCount === 1 ? '' : 's'} matched your notebook, but strict mode filtered them out because they violate hard constraints.`
                  : 'Try relaxing filters or switch mode to explore to discover more opportunities.'
              }
            />
            <div className="app-muted-panel text-sm">
              <p className="text-text-strong font-medium">Suggested next step</p>
              {mode === 'strict' ? (
                <p className="text-text-soft mt-1">
                  {hiddenByModeCount > 0 ? 'Switch to ' : 'You are in strict mode. Switch to '}
                  <span className="font-medium">approx</span>
                  {hiddenByModeCount > 0
                    ? ' to review near matches that were hidden by hard constraints.'
                    : ' to allow near matches.'}
                </p>
              ) : null}
              {mode === 'approx' ? (
                <p className="text-text-soft mt-1">
                  You are in approx mode. Switch to <span className="font-medium">explore</span> for broader discovery.
                </p>
              ) : null}
              {mode === 'explore' ? (
                <p className="text-text-soft mt-1">
                  You are in explore mode. Clear status/tag filters and enqueue a fresh scrape run.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button type="button" variant="secondary" disabled={!canPrev} onClick={onPrev}>
          Previous
        </Button>
        <p className="text-muted-foreground text-xs">Offset: {offset}</p>
        <Button type="button" variant="secondary" disabled={!canNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </Card>
  );
};

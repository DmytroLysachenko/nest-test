'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Inbox, Layers3 } from 'lucide-react';

import { getNotebookCollectionState } from '@/features/job-offers/model/notebook-state-copy';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type NotebookOffersListCardProps = {
  offers: JobOfferListItemDto[];
  hiddenByModeCount: number;
  degradedResultCount: number;
  lastScrapeStatus: string | null;
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
  onModeChange?: (mode: 'strict' | 'approx' | 'explore') => void;
  onOpenPlanning?: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export const NotebookOffersListCard = ({
  offers,
  hiddenByModeCount,
  degradedResultCount,
  lastScrapeStatus,
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
  onModeChange,
  onOpenPlanning,
  onPrev,
  onNext,
}: NotebookOffersListCardProps) => {
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState('');
  const [bulkNextStep, setBulkNextStep] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const canSaveBulkFollowUp = useMemo(
    () =>
      selectedOfferIds.length > 0 &&
      (bulkFollowUpAt.trim().length > 0 || bulkNextStep.trim().length > 0 || bulkNote.trim().length > 0),
    [bulkFollowUpAt, bulkNextStep, bulkNote, selectedOfferIds.length],
  );
  const collectionState = getNotebookCollectionState({
    mode,
    hiddenByModeCount,
    degradedResultCount,
    lastScrapeStatus,
  });

  useEffect(() => {
    if (!selectedOfferIds.length) {
      setBulkPanelOpen(false);
    }
  }, [selectedOfferIds.length]);

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

  const handlePrimaryCollectionAction = () => {
    if (collectionState.nextMode && onModeChange) {
      onModeChange(collectionState.nextMode);
      return;
    }

    onOpenPlanning?.();
  };

  return (
    <Card title="Offer queue" description="The active notebook slice, organized for fast review and batch maintenance.">
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
        {degradedResultCount > 0 ? <span className="app-badge">degraded source: {degradedResultCount}</span> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {selectedOfferIds.length ? (
            <Button
              type="button"
              variant={bulkPanelOpen ? 'default' : 'secondary'}
              className="h-8 px-3 text-xs"
              disabled={isBusy}
              onClick={() => setBulkPanelOpen((current) => !current)}
            >
              <Layers3 className="mr-2 h-3.5 w-3.5" />
              {bulkPanelOpen ? 'Hide bulk plan' : 'Edit bulk plan'}
            </Button>
          ) : null}
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

      {selectedOfferIds.length ? (
        <div className="mb-4 space-y-3">
          <WorkflowInlineNotice
            title={`Bulk actions are ready for ${selectedOfferIds.length} selected offer${selectedOfferIds.length === 1 ? '' : 's'}`}
            description="Use bulk save or dismiss for quick cleanup. Open the bulk plan only when you need to stamp one follow-up date, next step, or note across the selection."
            tone="info"
          />
          {bulkPanelOpen ? (
            <div className="app-muted-panel space-y-3">
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
                    setBulkPanelOpen(false);
                  }}
                >
                  Save bulk follow-up
                </Button>
              </div>
              <p className="text-text-soft text-xs">
                Apply one follow-up date, next step, or note across the current selection without opening each offer.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-4">
          <WorkflowInlineNotice
            title="Review first, bulk-edit second"
            description="Selections stay out of the way until you need them. Open an offer for deeper work, or select several roles to reveal bulk actions."
            tone="success"
          />
        </div>
      )}

      <div className="space-y-3">
        {offers.length ? (
          offers.map((offer) => (
            <article
              key={offer.id}
              className={`w-full rounded-[1.45rem] p-4 text-left text-sm transition-all duration-200 ${
                selectedId === offer.id
                  ? 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_8%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent))] shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_18%,transparent)]'
                  : 'bg-surface-elevated/88 hover:bg-surface-elevated hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--text-strong)_12%,transparent)]'
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
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-base font-semibold tracking-[-0.02em]">
                        {offer.title}
                      </p>
                      <p className="text-secondary-foreground mt-1">{offer.company ?? 'Unknown company'}</p>
                      <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.14em]">
                        {offer.location ?? 'Unknown location'}
                      </p>
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

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-text-soft text-xs leading-6">
                  {offer.followUpState === 'due'
                    ? 'Due now. Handle this before widening the funnel.'
                    : offer.followUpState === 'upcoming'
                      ? 'Upcoming follow-up scheduled. Keep the thread warm.'
                      : offer.status === 'NEW' || offer.status === 'SEEN'
                        ? 'First-pass triage candidate.'
                        : 'Continue moving this role through the pipeline.'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-0 text-xs"
                  onClick={() => onSelectOffer(offer.id)}
                >
                  Open workspace
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>

              {(getPipelineValue(offer, 'nextStep') || getPipelineValue(offer, 'followUpNote')) && (
                <div className="bg-surface-muted/72 mt-3 rounded-[1.1rem] px-3 py-2.5 text-xs">
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
            <WorkflowFeedback
              eyebrow="Notebook state"
              icon={<Inbox className="h-5 w-5" />}
              title={collectionState.title}
              description={collectionState.description}
              tone={
                collectionState.key === 'failed' ? 'danger' : collectionState.key === 'degraded' ? 'warning' : 'info'
              }
              actionLabel={collectionState.actionLabel}
              onAction={handlePrimaryCollectionAction}
            />
            <WorkflowInlineNotice
              title={collectionState.nextStepTitle}
              description={collectionState.nextStepDescription}
              tone={collectionState.key === 'failed' ? 'danger' : 'info'}
            />
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

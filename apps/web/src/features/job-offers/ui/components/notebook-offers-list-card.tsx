'use client';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type NotebookOffersListCardProps = {
  offers: JobOfferListItemDto[];
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
  onPrev: () => void;
  onNext: () => void;
};

export const NotebookOffersListCard = ({
  offers,
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
  onPrev,
  onNext,
}: NotebookOffersListCardProps) => (
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

    <div className="space-y-2">
      {offers.length ? (
        offers.map((offer) => (
          <article
            key={offer.id}
            className={`w-full rounded-[1.35rem] border p-4 text-left text-sm transition ${
              selectedId === offer.id
                ? 'border-primary bg-accent/18 shadow-[0_20px_40px_-32px_color-mix(in_oklab,var(--primary)_42%,black)]'
                : 'border-border/80 bg-card/92 hover:border-primary/35 hover:bg-surface-elevated/95'
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
              {offer.rankingScore !== undefined ? <span className="app-badge">rank: {offer.rankingScore}</span> : null}
              {offer.sourceRunId ? <span className="app-badge">run: {offer.sourceRunId.slice(0, 8)}</span> : null}
              {(offer.explanationTags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="app-badge">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))
      ) : (
        <div className="space-y-3">
          <EmptyState
            title="No offers found"
            description="Try relaxing filters or switch mode to explore to discover more opportunities."
          />
          <div className="app-muted-panel text-sm">
            <p className="text-text-strong font-medium">Suggested next step</p>
            {mode === 'strict' ? (
              <p className="text-text-soft mt-1">
                You are in strict mode. Switch to <span className="font-medium">approx</span> to allow near matches.
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

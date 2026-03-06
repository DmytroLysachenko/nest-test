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
  onSelectOffer,
  onToggleOfferSelection,
  onSelectAllVisible,
  onClearSelected,
  onBulkStatusChange,
  onPrev,
  onNext,
}: NotebookOffersListCardProps) => (
  <Card title="Offers" description="Filtered notebook results">
    <div className="mb-3 flex flex-wrap items-center gap-2">
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

    <div className="space-y-2">
      {offers.length ? (
        offers.map((offer) => (
          <article
            key={offer.id}
            className={`w-full rounded-md border p-3 text-left text-sm transition ${
              selectedId === offer.id ? 'border-primary bg-accent/20' : 'border-border bg-card hover:border-primary/35'
            }`}
          >
            <div className="mb-2 flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedOfferIds.includes(offer.id)}
                onChange={() => onToggleOfferSelection(offer.id)}
                className="mt-1"
                aria-label={`Select ${offer.title}`}
              />
              <button type="button" onClick={() => onSelectOffer(offer.id)} className="min-w-0 flex-1 text-left">
                <p className="text-foreground truncate font-semibold">{offer.title}</p>
                <p className="text-secondary-foreground">{offer.company ?? 'Unknown company'}</p>
                <p className="text-muted-foreground text-xs">{offer.location ?? 'Unknown location'}</p>
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="app-badge">status: {offer.status}</span>
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
        <EmptyState
          title="No offers found"
          description="Try relaxing filters or switch mode to explore to discover more opportunities."
        />
      )}
    </div>

    <div className="mt-4 flex items-center justify-between">
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

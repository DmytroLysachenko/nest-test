'use client';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

import type { JobOfferListItemDto } from '@/shared/types/api';

type NotebookOffersListCardProps = {
  offers: JobOfferListItemDto[];
  selectedId: string | null;
  offset: number;
  canPrev: boolean;
  canNext: boolean;
  onSelectOffer: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

export const NotebookOffersListCard = ({
  offers,
  selectedId,
  offset,
  canPrev,
  canNext,
  onSelectOffer,
  onPrev,
  onNext,
}: NotebookOffersListCardProps) => (
  <Card title="Offers" description="Filtered notebook results">
    <div className="space-y-2">
      {offers.length ? (
        offers.map((offer) => (
          <button
            key={offer.id}
            type="button"
            onClick={() => onSelectOffer(offer.id)}
            className={`w-full rounded-md border p-3 text-left text-sm transition ${
              selectedId === offer.id ? 'border-primary bg-accent/20' : 'border-border bg-card hover:border-primary/35'
            }`}
          >
            <p className="text-foreground font-semibold">{offer.title}</p>
            <p className="text-secondary-foreground">{offer.company ?? 'Unknown company'}</p>
            <p className="text-muted-foreground text-xs">{offer.location ?? 'Unknown location'}</p>
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
          </button>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">No offers found for current filters.</p>
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

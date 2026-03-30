'use client';

import { ArrowRight, Compass, Eye, FolderPlus, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import type { DiscoveryJobOfferListItemDto } from '@/shared/types/api';

type OpportunitiesListCardProps = {
  offers: DiscoveryJobOfferListItemDto[];
  total: number;
  mode: 'strict' | 'approx' | 'explore';
  hasScore: 'all' | 'yes' | 'no';
  search: string;
  tag: string;
  selectedId: string | null;
  canPrev: boolean;
  canNext: boolean;
  isBusy: boolean;
  onSelectOffer: (id: string) => void;
  onModeChange: (value: 'strict' | 'approx' | 'explore') => void;
  onHasScoreChange: (value: 'all' | 'yes' | 'no') => void;
  onSearchChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onResetFilters: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSave: (id: string) => void;
  onMarkSeen: (id: string) => void;
  onDismiss: (id: string) => void;
};

export const OpportunitiesListCard = ({
  offers,
  total,
  mode,
  hasScore,
  search,
  tag,
  selectedId,
  canPrev,
  canNext,
  isBusy,
  onSelectOffer,
  onModeChange,
  onHasScoreChange,
  onSearchChange,
  onTagChange,
  onResetFilters,
  onPrev,
  onNext,
  onSave,
  onMarkSeen,
  onDismiss,
}: OpportunitiesListCardProps) => {
  const groups = [
    {
      key: 'fresh',
      title: 'Fresh review',
      description: 'New matches that still need a first keep-or-dismiss decision.',
      items: offers.filter((offer) => offer.status === 'NEW' && !offer.isInPipeline),
    },
    {
      key: 'reviewed',
      title: 'Reviewed once',
      description: 'Roles you looked at already but have not promoted into active workflow yet.',
      items: offers.filter((offer) => offer.status === 'SEEN' && !offer.isInPipeline),
    },
    {
      key: 'pipeline',
      title: 'Already in pipeline',
      description: 'Kept roles stay visible here for context, but active management belongs in Notebook.',
      items: offers.filter((offer) => offer.isInPipeline),
    },
  ].filter((group) => group.items.length > 0);

  const renderOffer = (offer: DiscoveryJobOfferListItemDto) => (
    <article
      key={offer.id}
      className={`rounded-[1.45rem] p-4 transition-all duration-200 ${
        selectedId === offer.id
          ? 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_8%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent))] shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_18%,transparent)]'
          : 'bg-surface-elevated/88 hover:bg-surface-elevated hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--text-strong)_12%,transparent)]'
      }`}
    >
      <button type="button" onClick={() => onSelectOffer(offer.id)} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-foreground truncate text-base font-semibold tracking-[-0.02em]">{offer.title}</p>
            <p className="text-secondary-foreground mt-1">{offer.company ?? 'Unknown company'}</p>
            <p className="text-muted-foreground mt-1 text-xs uppercase tracking-[0.14em]">
              {offer.location ?? 'Unknown location'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-badge">status: {offer.status}</span>
            <span className="app-badge">score: {offer.matchScore ?? 'n/a'}</span>
          </div>
        </div>
        <p className="text-text-strong mt-3 text-sm font-medium">{offer.fitSummary ?? 'Review this role manually.'}</p>
        {offer.fitHighlights.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.fitHighlights.map((highlight) => (
              <span key={highlight} className="app-badge">
                {highlight}
              </span>
            ))}
          </div>
        ) : null}
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-text-soft text-xs">
          {offer.isInPipeline
            ? 'Already in your active workflow.'
            : offer.status === 'SEEN'
              ? 'Already reviewed once. Decide whether to save or dismiss.'
              : 'Fresh match ready for first-pass review.'}
        </p>
        <Button type="button" variant="ghost" className="h-8 px-0 text-xs" onClick={() => onSelectOffer(offer.id)}>
          Open details
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={isBusy} onClick={() => onSave(offer.id)}>
          <FolderPlus className="mr-2 h-3.5 w-3.5" />
          Save to pipeline
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onMarkSeen(offer.id)}>
          <Eye className="mr-2 h-3.5 w-3.5" />
          Mark reviewed
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={() => onDismiss(offer.id)}>
          <X className="mr-2 h-3.5 w-3.5" />
          Dismiss
        </Button>
      </div>
    </article>
  );

  return (
    <Card
      title="Opportunity queue"
      description="Review matched roles, decide quickly, and only push keepers into the active pipeline."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="app-field-group">
            <Label htmlFor="opportunity-mode" className="app-inline-label">
              Review mode
            </Label>
            <select
              id="opportunity-mode"
              className="app-select"
              value={mode}
              onChange={(event) => onModeChange(event.target.value as 'strict' | 'approx' | 'explore')}
            >
              <option value="strict">Strict</option>
              <option value="approx">Approx</option>
              <option value="explore">Explore</option>
            </select>
          </div>
          <div className="app-field-group">
            <Label htmlFor="opportunity-score" className="app-inline-label">
              Scoring
            </Label>
            <select
              id="opportunity-score"
              className="app-select"
              value={hasScore}
              onChange={(event) => onHasScoreChange(event.target.value as 'all' | 'yes' | 'no')}
            >
              <option value="all">All</option>
              <option value="yes">Scored only</option>
              <option value="no">Unscored only</option>
            </select>
          </div>
          <div className="app-field-group">
            <Label htmlFor="opportunity-tag" className="app-inline-label">
              Tag
            </Label>
            <Input id="opportunity-tag" value={tag} placeholder="backend" onChange={(event) => onTagChange(event.target.value)} />
          </div>
          <div className="app-field-group md:col-span-2 lg:col-span-3">
            <Label htmlFor="opportunity-search" className="app-inline-label">
              Search
            </Label>
            <Input
              id="opportunity-search"
              value={search}
              placeholder="Search title, company, notes, or tags"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className="app-utility-rail space-y-4">
          <div className="app-inset-stack">
            <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Current queue</p>
            <p className="text-text-strong mt-2 text-2xl font-semibold tracking-[-0.03em]">{total}</p>
            <p className="text-text-soft mt-1 text-sm">matched opportunities available for review</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onResetFilters} className="h-9 px-4">
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {offers.length ? (
          groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-text-strong text-sm font-semibold">{group.title}</p>
                  <p className="text-text-soft text-xs">{group.description}</p>
                </div>
                <span className="app-badge">{group.items.length}</span>
              </div>
              <div className="space-y-3">{group.items.map(renderOffer)}</div>
            </section>
          ))
        ) : (
          <EmptyState
            icon={<Compass className="h-8 w-8" />}
            title="No opportunities in this slice"
            description="Widen the review mode or reset filters before assuming the matched catalog is empty."
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button type="button" variant="secondary" disabled={!canPrev} onClick={onPrev}>
          Previous
        </Button>
        <p className="text-muted-foreground text-xs">Offset-based paging</p>
        <Button type="button" variant="secondary" disabled={!canNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </Card>
  );
};

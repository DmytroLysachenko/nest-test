'use client';

import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Briefcase, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type PipelineColumnProps = {
  title: string;
  status: JobOfferStatus;
  offers: JobOfferListItemDto[];
  icon: React.ReactNode;
  onSelect: (id: string) => void;
  selectedId: string | null;
};

const PipelineColumn = ({ title, status, offers, icon, onSelect, selectedId }: PipelineColumnProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2 px-1">
      <div className="text-primary/60">{icon}</div>
      <h3 className="text-text-strong font-semibold">{title}</h3>
      <span className="text-text-soft bg-surface-muted border-border/50 ml-auto rounded-full border px-2 py-0.5 text-xs font-medium">
        {offers.length}
      </span>
    </div>

    <div className="flex min-h-[200px] flex-col gap-3">
      {offers.length > 0 ? (
        offers.map((offer) => (
          <button
            key={offer.id}
            type="button"
            onClick={() => onSelect(offer.id)}
            className={`group w-full rounded-2xl border p-3 text-left transition-all duration-200 ${
              selectedId === offer.id
                ? 'border-primary/50 bg-primary/5 shadow-sm'
                : 'border-border/60 bg-surface/80 hover:border-primary/30 hover:shadow-sm'
            }`}
          >
            <p className="text-text-strong mb-1 truncate text-xs font-bold">{offer.title}</p>
            <p className="text-text-soft truncate text-[10px]">{offer.company}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="bg-surface-elevated border-border/40 rounded border px-1.5 py-0.5 text-[10px] font-medium">
                {offer.matchScore ?? '??'}%
              </span>
              {offer.aiFeedbackScore ? (
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  <span className="text-[9px] font-bold">{offer.aiFeedbackScore}</span>
                </div>
              ) : null}
            </div>
          </button>
        ))
      ) : (
        <div className="border-border/60 bg-surface-muted/20 flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
          <p className="text-text-soft text-[10px]">Empty</p>
        </div>
      )}
    </div>
  </div>
);

type NotebookPipelineCardProps = {
  offers: JobOfferListItemDto[];
  selectedId: string | null;
  onSelectOffer: (id: string) => void;
};

export const NotebookPipelineCard = ({ offers, selectedId, onSelectOffer }: NotebookPipelineCardProps) => {
  const saved = offers.filter((o) => o.status === 'SAVED');
  const applied = offers.filter((o) => o.status === 'APPLIED');
  const interviewing = offers.filter((o) => o.status === 'INTERVIEWING');
  const offerMade = offers.filter((o) => o.status === 'OFFER');

  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-8 w-8" />}
        title="Pipeline is empty"
        description="Save some job offers first to start tracking your applications."
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <PipelineColumn
        title="Saved"
        status="SAVED"
        offers={saved}
        icon={<Star className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
      />
      <PipelineColumn
        title="Applied"
        status="APPLIED"
        offers={applied}
        icon={<CheckCircle2 className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
      />
      <PipelineColumn
        title="Interview"
        status="INTERVIEWING"
        offers={interviewing}
        icon={<MessageSquare className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
      />
      <PipelineColumn
        title="Offer"
        status="OFFER"
        offers={offerMade}
        icon={<CheckCircle2 className="text-app-success h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
      />
    </div>
  );
};

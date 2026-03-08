'use client';

import { Briefcase, CheckCircle2, MessageSquare, Star, ArrowRight } from 'lucide-react';

import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type PipelineColumnProps = {
  title: string;
  status: JobOfferStatus;
  offers: JobOfferListItemDto[];
  icon: React.ReactNode;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onMove?: (id: string, nextStatus: JobOfferStatus) => void;
  nextStatus?: JobOfferStatus;
};

const PipelineColumn = ({
  title,
  status,
  offers,
  icon,
  onSelect,
  selectedId,
  onMove,
  nextStatus,
}: PipelineColumnProps) => (
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
          <div
            key={offer.id}
            className={`group relative w-full rounded-2xl border p-3 text-left transition-all duration-200 ${
              selectedId === offer.id
                ? 'border-primary/50 bg-primary/5 shadow-sm'
                : 'border-border/60 bg-surface/80 hover:border-primary/30 hover:shadow-sm'
            }`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(offer.id)}>
              <p className="text-text-strong mb-1 truncate text-xs font-bold">{offer.title}</p>
              <p className="text-text-soft truncate text-[10px]">{offer.company}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="bg-surface-elevated border-border/40 rounded border px-1.5 py-0.5 text-[10px] font-medium">
                  {offer.matchScore ?? '??'}%
                </span>
                {offer.pipelineMeta && Object.keys(offer.pipelineMeta).length > 0 ? (
                  <span className="text-primary/80 bg-primary/10 rounded px-1 text-[9px] font-semibold">Has Meta</span>
                ) : null}
                {offer.aiFeedbackScore ? (
                  <div className="flex items-center gap-0.5 text-app-warning">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    <span className="text-[9px] font-bold">{offer.aiFeedbackScore}</span>
                  </div>
                ) : null}
              </div>
            </button>

            {onMove && nextStatus ? (
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(offer.id, nextStatus);
                  }}
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>
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
  onUpdateStatus: (payload: { id: string; status: JobOfferStatus }) => void;
};

export const NotebookPipelineCard = ({
  offers,
  selectedId,
  onSelectOffer,
  onUpdateStatus,
}: NotebookPipelineCardProps) => {
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

  const handleMove = (id: string, nextStatus: JobOfferStatus) => {
    onUpdateStatus({ id, status: nextStatus });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <PipelineColumn
        title="Saved"
        status="SAVED"
        offers={saved}
        icon={<Star className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
        onMove={handleMove}
        nextStatus="APPLIED"
      />
      <PipelineColumn
        title="Applied"
        status="APPLIED"
        offers={applied}
        icon={<CheckCircle2 className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
        onMove={handleMove}
        nextStatus="INTERVIEWING"
      />
      <PipelineColumn
        title="Interview"
        status="INTERVIEWING"
        offers={interviewing}
        icon={<MessageSquare className="h-4 w-4" />}
        onSelect={onSelectOffer}
        selectedId={selectedId}
        onMove={handleMove}
        nextStatus="OFFER"
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

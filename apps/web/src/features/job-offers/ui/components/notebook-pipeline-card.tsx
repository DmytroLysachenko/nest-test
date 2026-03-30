'use client';

import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Clock3, MessageSquare, Star } from 'lucide-react';

import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

type PipelineColumnProps = {
  title: string;
  subtitle: string;
  status: JobOfferStatus;
  offers: JobOfferListItemDto[];
  icon: React.ReactNode;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onMove?: (id: string, nextStatus: JobOfferStatus) => void;
  nextStatus?: JobOfferStatus;
  previousStatus?: JobOfferStatus;
};

const sortPipelineOffers = (offers: JobOfferListItemDto[]) =>
  [...offers].sort((left, right) => {
    const urgencyRank = (offer: JobOfferListItemDto) => {
      if (offer.followUpState === 'due') {
        return 0;
      }
      if (offer.followUpState === 'upcoming') {
        return 1;
      }
      return 2;
    };

    const urgencyDelta = urgencyRank(left) - urgencyRank(right);
    if (urgencyDelta !== 0) {
      return urgencyDelta;
    }

    return Number(right.matchScore ?? -1) - Number(left.matchScore ?? -1);
  });

const PipelineColumn = ({
  title,
  subtitle,
  status,
  offers,
  icon,
  onSelect,
  selectedId,
  onMove,
  nextStatus,
  previousStatus,
}: PipelineColumnProps) => (
  <div className="bg-surface-elevated/88 flex flex-col gap-4 rounded-[1.55rem] p-4 shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--text-strong)_12%,transparent)]">
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-2">
        <div className="text-primary/60">{icon}</div>
        <h3 className="text-text-strong font-semibold">{title}</h3>
        <span className="text-text-soft bg-surface-muted ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
          {offers.length}
        </span>
      </div>
      <p className="text-text-soft text-xs leading-5">{subtitle}</p>
    </div>

    <div className="flex min-h-[220px] flex-col gap-3">
      {offers.length > 0 ? (
        sortPipelineOffers(offers).map((offer) => (
          <div
            key={offer.id}
            className={`group relative w-full rounded-[1.25rem] border p-3 text-left transition-all duration-200 ${
              selectedId === offer.id
                ? 'border-primary/30 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_8%,white),color-mix(in_oklab,var(--surface-elevated)_72%,transparent))] shadow-sm'
                : 'border-transparent bg-surface-muted/70 hover:border-primary/15 hover:shadow-sm'
            }`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(offer.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-text-strong mb-1 truncate text-xs font-bold">{offer.title}</p>
                  <p className="text-text-soft truncate text-[10px]">{offer.company ?? 'Unknown company'}</p>
                  <p className="text-text-soft mt-1 truncate text-[10px] uppercase tracking-[0.14em]">
                    {offer.location ?? 'Unknown location'}
                  </p>
                </div>
                <span className="bg-surface-elevated rounded px-1.5 py-0.5 text-[10px] font-medium">
                  {offer.matchScore ?? 'n/a'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {offer.followUpState && offer.followUpState !== 'none' ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      offer.followUpState === 'due'
                        ? 'bg-app-warning/15 text-app-warning'
                        : 'bg-primary/10 text-primary/80'
                    }`}
                  >
                    {offer.followUpState === 'due' ? 'Follow-up due' : 'Follow-up upcoming'}
                  </span>
                ) : null}
                {offer.nextStep ? <span className="app-badge">Has next step</span> : null}
                {offer.pipelineMeta && Object.keys(offer.pipelineMeta).length > 0 ? (
                  <span className="text-primary/80 bg-primary/10 rounded px-1.5 py-0.5 text-[9px] font-semibold">
                    Has workflow data
                  </span>
                ) : null}
                {offer.aiFeedbackScore ? (
                  <div className="text-app-warning flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    <span className="text-[9px] font-bold">{offer.aiFeedbackScore}</span>
                  </div>
                ) : null}
              </div>

              <p className="text-text-soft mt-3 line-clamp-2 text-[11px] leading-5">
                {offer.nextStep
                  ? `Next step: ${offer.nextStep}`
                  : offer.followUpNote
                    ? offer.followUpNote
                    : 'Open the workspace below to add the next step, notes, and follow-up plan.'}
              </p>
            </button>

            {onMove && (previousStatus || nextStatus) ? (
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {previousStatus ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(offer.id, previousStatus);
                    }}
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                ) : null}
                {nextStatus ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(offer.id, nextStatus);
                    }}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="border-border/60 bg-surface-muted/20 flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
          <p className="text-text-strong text-xs font-semibold">Nothing in {status.toLowerCase()}</p>
          <p className="text-text-soft mt-1 text-[11px] leading-5">{subtitle}</p>
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
  const saved = offers.filter((offer) => offer.status === 'SAVED');
  const applied = offers.filter((offer) => offer.status === 'APPLIED');
  const interviewing = offers.filter((offer) => offer.status === 'INTERVIEWING');
  const offerMade = offers.filter((offer) => offer.status === 'OFFER');
  const dueCount = offers.filter((offer) => offer.followUpState === 'due').length;
  const upcomingCount = offers.filter((offer) => offer.followUpState === 'upcoming').length;

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
    <Card
      title="Pipeline board"
      description="This board is for active applications only. Urgent follow-ups rise to the top, and you can move roles backward or forward as the real process changes."
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="app-badge">{offers.length} active roles</span>
        <span className="app-badge">
          <Clock3 className="mr-1 h-3 w-3" />
          {dueCount} follow-up due
        </span>
        <span className="app-badge">{upcomingCount} upcoming</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PipelineColumn
          title="Saved"
          subtitle="Roles you want to keep, but still need a decision, follow-up plan, or first outbound move."
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
          subtitle="Applications already sent. Keep dates, recruiter context, and follow-up ownership attached here."
          status="APPLIED"
          offers={applied}
          icon={<CheckCircle2 className="h-4 w-4" />}
          onSelect={onSelectOffer}
          selectedId={selectedId}
          onMove={handleMove}
          previousStatus="SAVED"
          nextStatus="INTERVIEWING"
        />
        <PipelineColumn
          title="Interview"
          subtitle="Live interview loops or recruiter conversations. Use the workspace below for prep and history."
          status="INTERVIEWING"
          offers={interviewing}
          icon={<MessageSquare className="h-4 w-4" />}
          onSelect={onSelectOffer}
          selectedId={selectedId}
          onMove={handleMove}
          previousStatus="APPLIED"
          nextStatus="OFFER"
        />
        <PipelineColumn
          title="Offer"
          subtitle="Late-stage roles that need comparison, negotiation notes, and a clear final decision."
          status="OFFER"
          offers={offerMade}
          icon={<CheckCircle2 className="text-app-success h-4 w-4" />}
          onSelect={onSelectOffer}
          selectedId={selectedId}
          onMove={handleMove}
          previousStatus="INTERVIEWING"
        />
      </div>
    </Card>
  );
};

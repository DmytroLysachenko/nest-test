'use client';

import { Pointer } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { getUserFacingOfferStatus } from '@/shared/lib/presentation/job-search-ui';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatDateTime } from '@/shared/lib/utils/date-format';

import { OfferStructuredDetailsPanel } from './offer-structured-details-panel';
import { OfferReliabilityNotice } from './offer-reliability-notice';
import { OfferSourceLinks } from './offer-source-links';

import type { DiscoveryJobOfferListItemDto } from '@/shared/types/api';

type OpportunityDetailsRailProps = {
  offer: DiscoveryJobOfferListItemDto | null;
  isBusy: boolean;
  onSave: (id: string) => void;
  onMarkSeen: (id: string) => void;
  onDismiss: (id: string) => void;
};

export const OpportunityDetailsRail = ({
  offer,
  isBusy,
  onSave,
  onMarkSeen,
  onDismiss,
}: OpportunityDetailsRailProps) => {
  if (!offer) {
    return (
      <Card
        title="Opportunity details"
        description="Select a role from the discovery queue to inspect it."
        className="xl:h-[calc(100vh-7rem)]"
        contentClassName="xl:flex xl:h-[calc(100%-5.5rem)] xl:flex-col"
      >
        <div className="xl:flex xl:h-full xl:flex-col xl:justify-center">
          <EmptyState
            icon={<Pointer className="h-8 w-8" />}
            title="No opportunity selected"
            description="Use this rail for fit reasons, essential role context, and the keep-or-dismiss decision."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Opportunity details"
      description={offer.title}
      className="xl:flex xl:h-[calc(100vh-7rem)] xl:flex-col"
      contentClassName="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:gap-0"
    >
      <div className="space-y-4 text-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:space-y-0">
        <div className="app-inset-stack space-y-2 xl:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge">{getUserFacingOfferStatus(offer.status)}</span>
            {typeof offer.matchScore === 'number' ? <span className="app-badge">Match {offer.matchScore}</span> : null}
            {offer.isInPipeline ? <span className="app-badge">In pipeline</span> : null}
            {offer.isExpired ? <span className="app-badge">Expired</span> : null}
          </div>
          <p className="text-secondary-foreground font-medium">
            {offer.company ?? 'Unknown company'}
            {offer.location ? ` | ${offer.location}` : ''}
          </p>
          <p className="text-text-strong text-sm font-semibold">{offer.fitSummary ?? 'Review this role manually.'}</p>
          {offer.expiresAt ? (
            <p className="text-text-soft text-xs">
              {offer.isExpired ? 'Offer expired' : 'Offer valid until'} {formatDateTime(offer.expiresAt)}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
          <OfferReliabilityNotice reliabilityContext={offer.reliabilityContext} />

          {offer.fitHighlights.length ? (
            <div className="app-inset-stack space-y-2">
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Why it may fit</p>
              {offer.fitHighlights.map((highlight) => (
                <p key={highlight} className="text-text-soft text-sm leading-6">
                  {highlight}
                </p>
              ))}
            </div>
          ) : null}

          <OfferStructuredDetailsPanel structuredDetails={offer.structuredDetails} />

          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Role summary</p>
            <p className="text-text-soft text-sm leading-6">
              {offer.description?.trim() || 'Open the source listing if you need the full job description.'}
            </p>
            <OfferSourceLinks offer={offer} includeLocationSearch />
          </div>
        </div>

        <div className="border-border/60 bg-surface/95 xl:sticky xl:bottom-0 xl:mt-4 xl:shrink-0 xl:border-t xl:pt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isBusy} onClick={() => onSave(offer.id)}>
              Save to pipeline
            </Button>
            <Button type="button" variant="secondary" disabled={isBusy} onClick={() => onMarkSeen(offer.id)}>
              Mark reviewed
            </Button>
            <Button type="button" variant="ghost" disabled={isBusy} onClick={() => onDismiss(offer.id)}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

'use client';

import { Pointer } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { getSafeOfferField, getUserFacingOfferStatus } from '@/shared/lib/presentation/job-search-ui';
import { toTrimmedString } from '@/shared/lib/utils/input-normalizers';
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
        className="2xl:h-[calc(100vh-7rem)]"
        contentClassName="2xl:flex 2xl:h-[calc(100%-5.5rem)] 2xl:flex-col"
      >
        <div className="2xl:flex 2xl:h-full 2xl:flex-col 2xl:justify-center">
          <EmptyState
            icon={<Pointer className="h-8 w-8" />}
            title="No opportunity selected"
            description="Use this rail for fit reasons, essential role context, and the keep-or-dismiss decision."
          />
        </div>
      </Card>
    );
  }

  const safeLocation = getSafeOfferField(offer.location, 'location');

  return (
    <Card
      title="Opportunity details"
      description={offer.title}
      className="2xl:flex 2xl:h-[calc(100vh-7rem)] 2xl:flex-col"
      contentClassName="flex flex-col gap-4 2xl:min-h-0 2xl:flex-1 2xl:gap-0"
    >
      <div className="space-y-4 text-sm 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col 2xl:space-y-0">
        <header className="border-border/45 space-y-3 border-b pb-4 2xl:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge">{getUserFacingOfferStatus(offer.status)}</span>
            {typeof offer.matchScore === 'number' ? <span className="app-badge">Match {offer.matchScore}</span> : null}
            {offer.isInPipeline ? <span className="app-badge">In pipeline</span> : null}
            {offer.isExpired ? <span className="app-badge">Expired</span> : null}
          </div>
          <div className="space-y-2">
            <p className="text-secondary-foreground font-medium">
              {offer.company ?? 'Unknown company'}
              {safeLocation ? ` | ${safeLocation}` : ''}
            </p>
            <p className="text-text-strong text-sm font-semibold">{offer.fitSummary ?? 'Review this role manually.'}</p>
            {offer.expiresAt ? (
              <p className="text-text-soft text-xs">
                {offer.isExpired ? 'Offer expired' : 'Offer valid until'} {formatDateTime(offer.expiresAt)}
              </p>
            ) : null}
          </div>
        </header>

        <div className="space-y-5 pt-1 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1 2xl:pt-5">
          <OfferReliabilityNotice reliabilityContext={offer.reliabilityContext} />

          {offer.fitHighlights.length ? (
            <section className="space-y-3">
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Why it may fit</p>
              <div className="app-tonal-section space-y-2">
                {offer.fitHighlights.map((highlight) => (
                  <p key={highlight} className="text-text-soft text-sm leading-6">
                    {highlight}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <OfferStructuredDetailsPanel structuredDetails={offer.structuredDetails} />

          <section className="border-border/45 space-y-3 border-t pt-5">
            <div className="space-y-1.5">
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Role summary</p>
              <p className="text-text-soft text-sm leading-6">
                {toTrimmedString(offer.description) || 'Open the source listing if you need the full job description.'}
              </p>
            </div>
            <div className="app-open-section border-border/35 border-t pt-3">
              <OfferSourceLinks offer={offer} includeLocationSearch />
            </div>
          </section>
        </div>

        <div className="bg-surface/95 2xl:border-border/45 2xl:mt-5 2xl:shrink-0 2xl:border-t 2xl:pt-4">
          <div className="app-tonal-section flex flex-wrap gap-2">
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

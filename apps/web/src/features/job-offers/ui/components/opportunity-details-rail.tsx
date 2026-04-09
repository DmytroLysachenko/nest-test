'use client';

import Link from 'next/link';
import { ExternalLink, Pointer } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

import { OfferStructuredDetailsPanel } from './offer-structured-details-panel';

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
      <Card title="Opportunity details" description="Select a role from the discovery queue to inspect it.">
        <EmptyState
          icon={<Pointer className="h-8 w-8" />}
          title="No opportunity selected"
          description="Use this rail for fit reasons, essential role context, and the keep-or-dismiss decision."
        />
      </Card>
    );
  }

  return (
    <Card title="Opportunity details" description={offer.title}>
      <div className="space-y-4 text-sm">
        <div className="app-inset-stack space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge">{offer.status}</span>
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
              {offer.isExpired ? 'Offer expired' : 'Offer valid until'} {new Date(offer.expiresAt).toLocaleString()}
            </p>
          ) : null}
        </div>

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
          <p className="text-text-soft line-clamp-6 text-sm leading-6">
            {offer.description?.trim() || 'Open the source listing if you need the full job description.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {offer.url ? (
              <Link
                href={offer.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex text-sm underline-offset-4 hover:underline"
              >
                Open source listing
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            ) : null}
            {offer.structuredDetails?.companySummary?.id ? (
              <Link
                href={`/companies/${offer.structuredDetails.companySummary.id}`}
                className="text-primary inline-flex text-sm underline-offset-4 hover:underline"
              >
                Open company profile
              </Link>
            ) : null}
            {offer.location ? (
              <Link
                href={`/companies?location=${encodeURIComponent(offer.location)}`}
                className="text-primary inline-flex text-sm underline-offset-4 hover:underline"
              >
                More companies in {offer.location}
              </Link>
            ) : null}
          </div>
        </div>

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
    </Card>
  );
};

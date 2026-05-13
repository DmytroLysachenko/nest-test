import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { getSafeOfferField } from '@/shared/lib/presentation/job-search-ui';
import { buildPathWithQuery } from '@/shared/lib/utils/url-normalizers';

import type { JobOfferListItemDto } from '@/shared/types/api';

type OfferSourceLinksProps = {
  offer: Pick<JobOfferListItemDto, 'url' | 'sourceRunId' | 'structuredDetails' | 'location'>;
  includeLocationSearch?: boolean;
};

const linkClassName = 'text-primary inline-flex text-sm underline-offset-4 hover:underline';

export const OfferSourceLinks = ({ offer, includeLocationSearch = false }: OfferSourceLinksProps) => {
  const safeLocation = getSafeOfferField(offer.location, 'location');

  return (
    <div className="flex flex-wrap gap-3">
      {offer.url ? (
        <Link href={offer.url} target="_blank" rel="noreferrer" className={linkClassName}>
          Open source listing
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Link>
      ) : null}
      {offer.structuredDetails?.companySummary?.id ? (
        <Link href={`/companies/${offer.structuredDetails.companySummary.id}`} className={linkClassName}>
          Open company profile
        </Link>
      ) : null}
      {includeLocationSearch && safeLocation ? (
        <Link href={buildPathWithQuery('/companies', { location: safeLocation })} className={linkClassName}>
          More companies in {safeLocation}
        </Link>
      ) : null}
    </div>
  );
};

export const OfferCompactSourceLinks = ({ offer }: OfferSourceLinksProps) => (
  <div className="flex flex-wrap gap-2">
    {offer.url ? (
      <Link
        href={offer.url}
        target="_blank"
        rel="noreferrer"
        className="border-border bg-surface-muted/50 text-text-soft hover:bg-surface-muted inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] transition-colors"
      >
        Open source listing
        <ExternalLink className="ml-1 h-3.5 w-3.5" />
      </Link>
    ) : null}
    {offer.structuredDetails?.companySummary?.id ? (
      <Link
        href={`/companies/${offer.structuredDetails.companySummary.id}`}
        className="border-border bg-surface-muted/50 text-text-soft hover:bg-surface-muted inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] transition-colors"
      >
        Company profile
      </Link>
    ) : null}
  </div>
);

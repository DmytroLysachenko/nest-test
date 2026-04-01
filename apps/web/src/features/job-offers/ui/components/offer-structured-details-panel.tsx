'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import type { JobOfferListItemDto } from '@/shared/types/api';

type OfferStructuredDetailsPanelProps = {
  structuredDetails: JobOfferListItemDto['structuredDetails'];
};

const buildHighlights = (structuredDetails: JobOfferListItemDto['structuredDetails']) => {
  if (!structuredDetails) {
    return [];
  }

  return [
    structuredDetails.jobCategory ? { label: 'Category', value: structuredDetails.jobCategory } : null,
    structuredDetails.workModeLabel ? { label: 'Work mode', value: structuredDetails.workModeLabel } : null,
    structuredDetails.contractTypeLabel ? { label: 'Contract', value: structuredDetails.contractTypeLabel } : null,
    structuredDetails.employmentTypeLabel ? { label: 'Schedule', value: structuredDetails.employmentTypeLabel } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
};

export const OfferStructuredDetailsPanel = ({ structuredDetails }: OfferStructuredDetailsPanelProps) => {
  if (!structuredDetails) {
    return null;
  }

  const highlights = buildHighlights(structuredDetails);
  const companySummary = structuredDetails.companySummary;

  if (!companySummary && !highlights.length) {
    return null;
  }

  return (
    <div className="app-inset-stack space-y-3">
      <div className="space-y-1">
        <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Structured context</p>
        <p className="text-text-strong text-sm font-semibold">
          Use the normalized company and taxonomy view before dropping into raw listing text.
        </p>
      </div>

      {companySummary ? (
        <div className="app-muted-panel space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-text-strong text-sm font-semibold">{companySummary.canonicalName}</p>
            {companySummary.websiteUrl ? (
              <Link
                href={companySummary.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex text-xs underline-offset-4 hover:underline"
              >
                Company site
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            ) : null}
            {companySummary.sourceProfileUrl ? (
              <Link
                href={companySummary.sourceProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex text-xs underline-offset-4 hover:underline"
              >
                Source profile
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
          {companySummary.hqLocation ? <p className="text-text-soft text-sm">HQ: {companySummary.hqLocation}</p> : null}
          {companySummary.description ? (
            <p className="text-text-soft text-sm leading-6">{companySummary.description}</p>
          ) : null}
        </div>
      ) : null}

      {highlights.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.label} className="app-muted-panel space-y-1">
              <p className="text-text-soft text-[11px] uppercase tracking-[0.16em]">{item.label}</p>
              <p className="text-text-strong text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

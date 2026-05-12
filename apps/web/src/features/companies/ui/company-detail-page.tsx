'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink, MapPin } from 'lucide-react';

import { getCompanyDetail } from '@/features/companies/api/companies-api';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { formatDate, formatDateTime, formatRelativeTime } from '@/shared/lib/utils/date-format';
import { buildPathWithQuery } from '@/shared/lib/utils/url-normalizers';
import { PageErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';

type CompanyDetailPageProps = {
  token: string;
  companyId: string;
};

const CompanyDetailSkeleton = () => (
  <main className="app-page space-y-6">
    <section className="space-y-3">
      <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Company detail</p>
      <div className="bg-surface-muted h-4 w-24 animate-pulse rounded-full" />
      <div className="bg-surface-muted h-10 w-2/3 animate-pulse rounded-full" />
      <div className="bg-surface-muted h-4 w-full animate-pulse rounded-full" />
      <div className="bg-surface-muted h-4 w-4/5 animate-pulse rounded-full" />
      <div className="flex flex-wrap gap-2">
        <div className="bg-surface-muted h-8 w-28 animate-pulse rounded-full" />
        <div className="bg-surface-muted h-8 w-28 animate-pulse rounded-full" />
        <div className="bg-surface-muted h-8 w-36 animate-pulse rounded-full" />
      </div>
    </section>

    <section className="app-tonal-section grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="bg-surface-muted h-3 w-20 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-5 w-32 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-4 w-24 animate-pulse rounded-full" />
        </div>
      ))}
    </section>

    <section className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="app-tonal-section space-y-4">
          <div className="bg-surface-muted h-5 w-1/2 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-4 w-full animate-pulse rounded-full" />
          <div className="bg-surface-muted h-4 w-2/3 animate-pulse rounded-full" />
          <div className="flex flex-wrap gap-2">
            <div className="bg-surface-muted h-8 w-28 animate-pulse rounded-full" />
            <div className="bg-surface-muted h-8 w-36 animate-pulse rounded-full" />
          </div>
        </div>
      ))}
    </section>
  </main>
);

export const CompanyDetailPage = ({ token, companyId }: CompanyDetailPageProps) => {
  const companyQuery = useQuery({
    queryKey: queryKeys.companies.detail(token, companyId),
    queryFn: () => getCompanyDetail(token, companyId),
    enabled: Boolean(token && companyId),
  });

  if (companyQuery.isLoading) {
    return <CompanyDetailSkeleton />;
  }

  if (companyQuery.error) {
    return (
      <PageErrorState
        title="Company unavailable"
        message={companyQuery.error instanceof Error ? companyQuery.error.message : 'Unable to load company detail.'}
        onRetry={() => {
          void companyQuery.refetch();
        }}
      />
    );
  }

  const company = companyQuery.data;
  if (!company) {
    return (
      <main className="app-page">
        <Card title="Company" description="This route could not resolve a usable employer record.">
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="Company not found"
            description="Go back to the company list or return to opportunities and open another linked employer."
            action={
              <div className="flex flex-wrap gap-2">
                <Link href="/companies">
                  <Button type="button">Back to companies</Button>
                </Link>
                <Link href="/opportunities">
                  <Button type="button" variant="secondary">
                    Open opportunities
                  </Button>
                </Link>
              </div>
            }
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Company"
        title={company.canonicalName}
        subtitle={company.description ?? 'This employer is linked to offers already present in your workspace catalog.'}
        meta={
          <>
            <span className="app-badge">Active offers: {company.activeOfferCount}</span>
            <span className="app-badge">Total offers: {company.totalOfferCount}</span>
            {company.hqLocation ? (
              <span className="app-badge">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                {company.hqLocation}
              </span>
            ) : null}
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/companies">
              <Button type="button" variant="secondary">
                Back to list
              </Button>
            </Link>
            {company.websiteUrl ? (
              <Link href={company.websiteUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  Website
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : null}
            {company.sourceProfileUrl ? (
              <Link href={company.sourceProfileUrl} target="_blank" rel="noreferrer">
                <Button type="button">
                  Source profile
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="app-tonal-section space-y-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Company context</p>
            <p className="text-text-strong text-lg font-semibold">
              Use this page before deciding which linked role deserves active work.
            </p>
            <p className="text-text-soft text-sm">
              Keep employer research here, then jump back into opportunities or notebook when you want to act.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-badge">{company.activeOfferCount} active roles</span>
            <span className="app-badge">{company.totalOfferCount} total linked roles</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="app-open-section border-border/35 border-t pt-3">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Headquarters</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">{company.hqLocation ?? 'Not specified'}</p>
          </div>
          <div className="app-open-section border-border/35 border-t pt-3">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last seen</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">{formatDateTime(company.lastSeenAt)}</p>
            <p className="text-text-soft mt-1 text-xs">{formatRelativeTime(company.lastSeenAt)}</p>
          </div>
          <div className="app-open-section border-border/35 border-t pt-3">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Best use</p>
            <p className="text-text-soft mt-2 text-sm">
              Review company context here first, then open a specific role once the employer looks worth deeper effort.
            </p>
          </div>
        </div>
      </section>

      <Card title="Recent offers" description="The latest offers linked to this company in your workspace catalog.">
        <div className="app-open-section border-border/45 mb-4 flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Use this next</p>
            <p className="text-text-soft mt-1 text-sm">
              Return to role triage or your active pipeline once this employer looks worth deeper effort.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/opportunities">
              <Button type="button" variant="secondary" size="sm">
                Open opportunities
              </Button>
            </Link>
            <Link href="/notebook">
              <Button type="button" variant="secondary" size="sm">
                Open notebook
              </Button>
            </Link>
          </div>
        </div>
        {company.recentOffers.length ? (
          <div className="space-y-3">
            {company.recentOffers.map((offer) => (
              <article key={offer.id} className="app-tonal-section space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-text-strong text-base font-semibold">{offer.title}</p>
                    <p className="text-text-soft text-sm leading-6">
                      {offer.location ?? 'Location not specified'}
                      {offer.salary ? ` | ${offer.salary}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offer.isExpired ? (
                      <span className="app-badge">Expired</span>
                    ) : (
                      <span className="app-badge">Active</span>
                    )}
                    {offer.expiresAt ? (
                      <span className="app-badge">
                        {offer.isExpired ? 'Expired' : 'Valid until'} {formatDate(offer.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="app-open-section border-border/35 border-t pt-3">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Offer status</p>
                    <p className="text-text-soft mt-2 text-sm">
                      {offer.isExpired
                        ? 'This listing is no longer active, but it remains useful for employer context.'
                        : 'This listing is still active and can be used to understand current employer demand.'}
                    </p>
                  </div>
                  <div className="app-open-section border-border/35 border-t pt-3">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Next jump</p>
                    <p className="text-text-soft mt-2 text-sm">
                      Open the source listing for details or pivot back to the filtered company list for nearby
                      employers.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={offer.url} target="_blank" rel="noreferrer">
                    <Button type="button" size="sm">
                      Open listing
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {offer.location ? (
                    <Link href={buildPathWithQuery('/companies', { location: offer.location })}>
                      <Button type="button" size="sm" variant="secondary">
                        More in this location
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No linked offers"
            description="This company record exists, but there are no offers to show right now."
          />
        )}
      </Card>
    </main>
  );
};

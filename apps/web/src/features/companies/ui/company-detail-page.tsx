'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink, MapPin } from 'lucide-react';

import { getCompanyDetail } from '@/features/companies/api/companies-api';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { PageErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';

type CompanyDetailPageProps = {
  token: string;
  companyId: string;
};

export const CompanyDetailPage = ({ token, companyId }: CompanyDetailPageProps) => {
  const companyQuery = useQuery({
    queryKey: queryKeys.companies.detail(token, companyId),
    queryFn: () => getCompanyDetail(token, companyId),
    enabled: Boolean(token && companyId),
  });

  if (companyQuery.isLoading) {
    return <SectionLoadingState title="Company" description="Loading company detail..." rows={5} />;
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
      <Card title="Company" description="No company detail is available for this record.">
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Company not found"
          description="The record may have been removed or is not visible in this workspace."
        />
      </Card>
    );
  }

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Company Detail"
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
                Back to companies
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

      <Card title="Company context" description="Use this page to understand the employer and jump into recent linked offers.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Headquarters</p>
            <p className="text-text-strong text-sm font-semibold">{company.hqLocation ?? 'Not specified'}</p>
          </div>
          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last seen</p>
            <p className="text-text-strong text-sm font-semibold">{new Date(company.lastSeenAt).toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <Card title="Recent offers" description="The latest offers linked to this company in your workspace catalog.">
        {company.recentOffers.length ? (
          <div className="space-y-3">
            {company.recentOffers.map((offer) => (
              <div
                key={offer.id}
                className="border-border/60 bg-surface-muted/35 space-y-3 rounded-2xl border px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-text-strong text-sm font-semibold">{offer.title}</p>
                    <p className="text-text-soft text-sm">
                      {offer.location ?? 'Location not specified'}
                      {offer.salary ? ` | ${offer.salary}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offer.isExpired ? <span className="app-badge">Expired</span> : <span className="app-badge">Active</span>}
                    {offer.expiresAt ? (
                      <span className="app-badge">
                        {offer.isExpired ? 'Expired' : 'Valid until'} {new Date(offer.expiresAt).toLocaleDateString()}
                      </span>
                    ) : null}
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
                    <Link href={`/companies?location=${encodeURIComponent(offer.location)}`}>
                      <Button type="button" size="sm" variant="secondary">
                        More in this location
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
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

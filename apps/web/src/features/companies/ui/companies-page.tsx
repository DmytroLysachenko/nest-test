'use client';

import Link from 'next/link';
import { Building2, ExternalLink, MapPin } from 'lucide-react';

import { useCompaniesPage } from '@/features/companies/model/use-companies-page';
import { formatRelativeTime, formatStatusTimestamp } from '@/shared/lib/utils/date-format';
import { PageErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';

type CompaniesPageProps = {
  token: string;
  initialSearch?: string | null;
  initialLocation?: string | null;
  initialPage?: number;
};

export const CompaniesPage = ({
  token,
  initialSearch = null,
  initialLocation = null,
  initialPage = 1,
}: CompaniesPageProps) => {
  const companiesPage = useCompaniesPage({ token, initialSearch, initialLocation, initialPage });
  const companies = companiesPage.listQuery.data?.items ?? [];

  if (companiesPage.listQuery.error) {
    return (
      <PageErrorState
        title="Companies unavailable"
        message={
          companiesPage.listQuery.error instanceof Error
            ? companiesPage.listQuery.error.message
            : 'Unable to load companies.'
        }
        onRetry={() => {
          void companiesPage.listQuery.refetch();
        }}
      />
    );
  }

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Companies"
        title="Browse employers already in your workspace"
        subtitle="Use this view when you want to inspect employers, not just individual roles."
        meta={<span className="app-badge">{companiesPage.total} companies</span>}
      />

      <Card title="Find companies" description="Search by name, description, or location.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            value={companiesPage.search}
            placeholder="Company name or description"
            onChange={(event) => companiesPage.setSearch(event.target.value)}
          />
          <Input
            value={companiesPage.location}
            placeholder="Location"
            onChange={(event) => companiesPage.setLocation(event.target.value)}
          />
          <Button type="button" variant="secondary" onClick={companiesPage.resetFilters}>
            Clear
          </Button>
        </div>
      </Card>

      {companiesPage.listQuery.isLoading ? (
        <SectionLoadingState title="Companies" description="Loading company list..." rows={6} />
      ) : companies.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {companies.map((company) => (
            <Card
              key={company.id}
              title={company.canonicalName}
              description={company.description ?? 'No company summary saved yet for this employer.'}
              className="h-full"
            >
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="app-badge">{company.activeOfferCount} active roles</span>
                  <span className="app-badge">{company.totalOfferCount} roles total</span>
                  {company.hqLocation ? (
                    <span className="app-badge">
                      <MapPin className="mr-1 h-3.5 w-3.5" />
                      {company.hqLocation}
                    </span>
                  ) : null}
                </div>

                <div className="app-inset-stack space-y-1">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last seen</p>
                  <p className="text-text-strong text-sm font-semibold">{formatStatusTimestamp(company.lastSeenAt)}</p>
                  <p className="text-text-soft text-xs">{formatRelativeTime(company.lastSeenAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/companies/${company.id}`}>
                    <Button type="button" size="sm">
                      Open details
                    </Button>
                  </Link>
                  {company.websiteUrl ? (
                    <Link href={company.websiteUrl} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm" variant="secondary">
                        Website
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ) : null}
                  {company.sourceProfileUrl ? (
                    <Link href={company.sourceProfileUrl} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm" variant="secondary">
                        Source profile
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card title="Companies" description="No companies matched the current filters.">
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No companies found"
            description="Try a broader name or clear the location filter."
          />
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-text-soft text-sm">
          Page {companiesPage.page} | Showing {companies.length ? companiesPage.offset + 1 : 0}-
          {Math.min(companiesPage.offset + companies.length, companiesPage.total)} of {companiesPage.total}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!companiesPage.canPrev}
            onClick={() => companiesPage.setPage(companiesPage.page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!companiesPage.canNext}
            onClick={() => companiesPage.setPage(companiesPage.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </main>
  );
};

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

const CompaniesListSkeleton = () => (
  <section className="grid gap-4 xl:grid-cols-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="app-tonal-section space-y-4">
        <div className="space-y-2">
          <div className="bg-surface-muted h-4 w-24 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-7 w-2/3 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-4 w-full animate-pulse rounded-full" />
          <div className="bg-surface-muted h-4 w-4/5 animate-pulse rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-surface-muted h-8 w-28 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-8 w-24 animate-pulse rounded-full" />
          <div className="bg-surface-muted h-8 w-36 animate-pulse rounded-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="app-open-section border-border/35 border-t pt-3">
            <div className="bg-surface-muted h-3 w-20 animate-pulse rounded-full" />
            <div className="bg-surface-muted mt-2 h-4 w-32 animate-pulse rounded-full" />
          </div>
          <div className="app-open-section border-border/35 border-t pt-3">
            <div className="bg-surface-muted h-3 w-24 animate-pulse rounded-full" />
            <div className="bg-surface-muted mt-2 h-4 w-28 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </section>
);

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

      <section className="app-tonal-section space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Browse slice</p>
            <p className="text-text-strong text-lg font-semibold">Filter employers by name, description, or location</p>
            <p className="text-text-soft text-sm">
              Keep this route for employer research. Role triage still belongs in opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-badge">Page {companiesPage.page}</span>
            {companiesPage.location ? <span className="app-badge">Location {companiesPage.location}</span> : null}
            <Button type="button" variant="secondary" onClick={companiesPage.resetFilters}>
              Clear filters
            </Button>
          </div>
        </div>

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
            Reset
          </Button>
        </div>
      </section>

      {companiesPage.listQuery.isLoading ? (
        <CompaniesListSkeleton />
      ) : companies.length ? (
        <section className="space-y-4">
          <div className="app-open-section border-border/45 flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Current results</p>
              <p className="text-text-soft mt-1 text-sm">
                Showing {companies.length ? companiesPage.offset + 1 : 0}-
                {Math.min(companiesPage.offset + companies.length, companiesPage.total)} of {companiesPage.total}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="app-badge">Company research</span>
              <span className="app-badge">{companies.length} on this page</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {companies.map((company) => (
              <article key={company.id} className="app-tonal-section flex h-full flex-col gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Employer</p>
                  <div className="space-y-1">
                    <p className="text-text-strong text-xl font-semibold tracking-[-0.03em]">{company.canonicalName}</p>
                    <p className="text-text-soft text-sm leading-6">
                      {company.description ?? 'No company summary saved yet for this employer.'}
                    </p>
                  </div>
                </div>

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

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="app-open-section border-border/35 border-t pt-3">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last seen</p>
                    <p className="text-text-strong mt-2 text-sm font-semibold">
                      {formatStatusTimestamp(company.lastSeenAt)}
                    </p>
                    <p className="text-text-soft mt-1 text-xs">{formatRelativeTime(company.lastSeenAt)}</p>
                  </div>
                  <div className="app-open-section border-border/35 border-t pt-3">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Best use</p>
                    <p className="text-text-soft mt-2 text-sm">
                      Open this employer when you want context before picking which linked role deserves active work.
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
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
              </article>
            ))}
          </div>
        </section>
      ) : (
        <Card title="Companies" description="No companies matched the current filters.">
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No companies found"
            description="Try a broader name or clear the location filter."
          />
        </Card>
      )}

      <section className="app-open-section border-border/45 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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
      </section>
    </main>
  );
};

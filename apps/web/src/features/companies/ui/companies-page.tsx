'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink, MapPin } from 'lucide-react';

import { listCompanies } from '@/features/companies/api/companies-api';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { formatRelativeTime, formatStatusTimestamp } from '@/shared/lib/utils/date-format';
import { PageErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';

type CompaniesPageProps = {
  token: string;
  initialLocation?: string | null;
};

const PAGE_SIZE = 20;

export const CompaniesPage = ({ token, initialLocation = null }: CompaniesPageProps) => {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [offset, setOffset] = useState(0);

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      location: location.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [location, offset, search],
  );

  const companiesQuery = useQuery({
    queryKey: queryKeys.companies.list(token, params),
    queryFn: () => listCompanies(token, params),
    enabled: Boolean(token),
  });

  const companies = companiesQuery.data?.items ?? [];
  const total = companiesQuery.data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  if (companiesQuery.error) {
    return (
      <PageErrorState
        title="Companies unavailable"
        message={companiesQuery.error instanceof Error ? companiesQuery.error.message : 'Unable to load companies.'}
        onRetry={() => {
          void companiesQuery.refetch();
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
        meta={<span className="app-badge">{total} companies</span>}
      />

      <Card title="Find companies" description="Search by name, description, or location.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            value={search}
            placeholder="Company name or description"
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
          />
          <Input
            value={location}
            placeholder="Location"
            onChange={(event) => {
              setLocation(event.target.value);
              setOffset(0);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch('');
              setLocation('');
              setOffset(0);
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {companiesQuery.isLoading ? (
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
          Showing {companies.length ? offset + 1 : 0}-{Math.min(offset + companies.length, total)} of {total}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!canPrev}
            onClick={() => setOffset((value) => value - PAGE_SIZE)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canNext}
            onClick={() => setOffset((value) => value + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </main>
  );
};

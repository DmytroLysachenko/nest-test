'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useOpportunitiesPage } from '@/features/job-offers/model/use-opportunities-page';
import { OpportunitiesListCard } from '@/features/job-offers/ui/components/opportunities-list-card';
import { OpportunityDetailsRail } from '@/features/job-offers/ui/components/opportunity-details-rail';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';

import type { DiscoveryQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';

type OpportunitiesPageProps = {
  token: string;
  initialQuickAction?: DiscoveryQuickActionKey | null;
  initialOfferId?: string | null;
  initialMode?: 'strict' | 'approx' | 'explore';
  initialHasScore?: 'all' | 'yes' | 'no';
  initialSearch?: string;
  initialTag?: string;
  initialPage?: number;
  initialPerPage?: number;
};

export const OpportunitiesPage = ({
  token,
  initialQuickAction = null,
  initialOfferId = null,
  initialMode = 'approx',
  initialHasScore = 'all',
  initialSearch = '',
  initialTag = '',
  initialPage = 1,
  initialPerPage = 20,
}: OpportunitiesPageProps) => {
  const opportunities = useOpportunitiesPage({
    token,
    initialQuickAction,
    initialOfferId,
    initialMode,
    initialHasScore,
    initialSearch,
    initialTag,
    initialPage,
    initialPerPage,
  });
  const [showRail, setShowRail] = useState(false);
  const mobileDetailsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1536px)');
    const update = () => setShowRail(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (showRail || !opportunities.selectedOffer || !mobileDetailsRef.current) {
      return;
    }

    if (typeof mobileDetailsRef.current.scrollIntoView === 'function') {
      mobileDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [opportunities.selectedOffer, showRail]);

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        title="Review new roles quickly"
        subtitle="Keep or dismiss new matches fast, then move only the worthwhile roles into your active pipeline."
        meta={
          opportunities.summaryQuery.data ? (
            <>
              <span className="app-badge">Unseen: {opportunities.summaryQuery.data.unseen}</span>
              <span className="app-badge">Reviewed: {opportunities.summaryQuery.data.reviewed}</span>
              <span className="app-badge">In pipeline: {opportunities.summaryQuery.data.inPipeline}</span>
            </>
          ) : undefined
        }
        action={
          <Link href="/notebook">
            <Button variant="secondary">Open notebook</Button>
          </Link>
        }
      />

      <div className="relative grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(480px,0.75fr)]">
        <div>
          {opportunities.listQuery.isLoading ? (
            <SectionLoadingState title="Opportunities" description="Loading the discovery queue..." rows={6} />
          ) : opportunities.listError ? (
            <SectionErrorState
              title="Opportunities"
              message={opportunities.listError}
              onRetry={() => {
                void opportunities.listQuery.refetch();
              }}
            />
          ) : (
            <OpportunitiesListCard
              offers={opportunities.listQuery.data?.items ?? []}
              total={opportunities.listQuery.data?.total ?? 0}
              collectionState={opportunities.listQuery.data?.collectionState ?? null}
              mode={opportunities.mode}
              hasScore={opportunities.hasScore}
              search={opportunities.search}
              tag={opportunities.tag}
              page={opportunities.page}
              perPage={opportunities.perPage}
              selectedId={opportunities.selectedId}
              offset={opportunities.offset}
              limit={opportunities.perPage}
              canPrev={opportunities.canPrev}
              canNext={opportunities.canNext}
              isBusy={opportunities.isBusy}
              onSelectOffer={opportunities.setSelectedId}
              onModeChange={opportunities.setMode}
              onHasScoreChange={opportunities.setHasScore}
              onSearchChange={opportunities.setSearch}
              onTagChange={opportunities.setTag}
              onPageChange={opportunities.setPage}
              onPerPageChange={opportunities.setPerPage}
              onResetFilters={opportunities.resetFilters}
              onPrev={() => opportunities.setPage(opportunities.page - 1)}
              onNext={() => opportunities.setPage(opportunities.page + 1)}
              onSave={opportunities.saveOpportunity}
              onMarkSeen={opportunities.markSeen}
              onDismiss={opportunities.dismiss}
            />
          )}
        </div>

        {showRail ? (
          <div className="hidden min-w-0 2xl:sticky 2xl:top-24 2xl:block 2xl:self-start">
            <OpportunityDetailsRail
              offer={opportunities.selectedOffer}
              isBusy={opportunities.isBusy}
              onSave={opportunities.saveOpportunity}
              onMarkSeen={opportunities.markSeen}
              onDismiss={opportunities.dismiss}
            />
          </div>
        ) : null}
      </div>

      {!showRail ? (
        <section ref={mobileDetailsRef} className="space-y-3">
          <div className="app-open-section border-border/45 border-b pb-3 2xl:hidden">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Selected opportunity</p>
            <p className="text-text-soft mt-1 text-sm">
              Keep fit context and the keep-or-dismiss action close without squeezing the main queue on smaller screens.
            </p>
          </div>
          <OpportunityDetailsRail
            offer={opportunities.selectedOffer}
            isBusy={opportunities.isBusy}
            onSave={opportunities.saveOpportunity}
            onMarkSeen={opportunities.markSeen}
            onDismiss={opportunities.dismiss}
          />
        </section>
      ) : null}
    </main>
  );
};

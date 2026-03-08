'use client';

import { useEffect } from 'react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOfferDetailsCard } from '@/features/job-offers/ui/components/notebook-offer-details-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { Button } from '@/shared/ui/button';

type NotebookPageProps = {
  token: string;
};

export const NotebookPage = ({ token }: NotebookPageProps) => {
  const notebook = useNotebookPage({ token });
  const setLastVisitedSection = useAppUiStore((state) => state.setLastVisitedSection);
  const selectedOffer = notebook.selectedOffer;
  const updateStatus = notebook.updateStatus;

  useEffect(() => {
    setLastVisitedSection('notebook');
  }, [setLastVisitedSection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (!selectedOffer) {
        return;
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        updateStatus({ id: selectedOffer.id, status: 'SAVED' });
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        updateStatus({ id: selectedOffer.id, status: 'DISMISSED' });
      }
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        updateStatus({ id: selectedOffer.id, status: 'SEEN' });
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        updateStatus({ id: selectedOffer.id, status: 'APPLIED' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedOffer, updateStatus]);

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Notebook"
        title="Offer Review Workspace"
        subtitle="Filter, compare, and update job opportunities without losing context across sourcing runs."
        meta={
          <>
            <span className="app-badge">Selected: {notebook.selectedOfferIds.length}</span>
            <span className="app-badge">Mode: {notebook.filters.mode}</span>
            <span className="app-badge">Visible: {notebook.listQuery.data?.items.length ?? 0}</span>
          </>
        }
      />

      <NotebookFiltersCard
        status={notebook.filters.status}
        mode={notebook.filters.mode}
        hasScore={notebook.filters.hasScore}
        tag={notebook.filters.tag}
        search={notebook.filters.search}
        onResetFilters={notebook.resetNotebookFilters}
        onSavePreset={notebook.saveNotebookFilterPreset}
        onApplyPreset={notebook.applyNotebookFilterPreset}
        hasSavedPreset={Boolean(notebook.savedPreset)}
        activeFilters={notebook.activeFilters}
        total={notebook.listQuery.data?.total ?? 0}
        listUpdatedAt={notebook.listQuery.dataUpdatedAt}
        isEnqueueingScrape={notebook.enqueueProfileScrapeMutation.isPending}
        onEnqueueProfileScrape={() => notebook.enqueueProfileScrapeMutation.mutate()}
        enqueueStatus={
          notebook.enqueueProfileScrapeMutation.data
            ? notebook.enqueueProfileScrapeMutation.data.status === 'reused'
              ? `Reused recent run (${notebook.enqueueProfileScrapeMutation.data.sourceRunId.slice(0, 8)})`
              : `Queued run ${notebook.enqueueProfileScrapeMutation.data.sourceRunId.slice(0, 8)}`
            : null
        }
        onStatusChange={(value) => notebook.setNotebookFilter('status', value)}
        onModeChange={(value) => notebook.setNotebookFilter('mode', value)}
        onHasScoreChange={(value) => notebook.setNotebookFilter('hasScore', value)}
        onTagChange={(value) => notebook.setNotebookFilter('tag', value)}
        onSearchChange={(value) => notebook.setNotebookFilter('search', value)}
      />

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <div className={notebook.selectedId ? 'hidden xl:block' : 'block'}>
          {notebook.listQuery.isLoading ? (
            <SectionLoadingState title="Offers" description="Loading notebook offers..." rows={7} />
          ) : notebook.listError ? (
            <SectionErrorState
              title="Offers"
              message={notebook.listError}
              onRetry={() => {
                void notebook.listQuery.refetch();
              }}
            />
          ) : (
            <NotebookOffersListCard
              offers={notebook.listQuery.data?.items ?? []}
              selectedId={notebook.selectedId}
              selectedOfferIds={notebook.selectedOfferIds}
              isBusy={notebook.isBusy}
              offset={notebook.pagination.offset}
              canPrev={notebook.canPrev}
              canNext={notebook.canNext}
              isAllVisibleSelected={notebook.isAllVisibleSelected}
              mode={notebook.filters.mode}
              onSelectOffer={notebook.setNotebookSelectedOffer}
              onToggleOfferSelection={notebook.toggleNotebookSelectedOfferId}
              onSelectAllVisible={() => {
                if (notebook.isAllVisibleSelected) {
                  notebook.clearNotebookSelectedOfferIds();
                  return;
                }
                notebook.setNotebookSelectedOfferIds(notebook.selectedVisibleIds);
              }}
              onClearSelected={notebook.clearNotebookSelectedOfferIds}
              onBulkStatusChange={(status) => {
                notebook.bulkUpdateStatus({
                  ids: notebook.selectedOfferIds,
                  status,
                });
              }}
              onPrev={() => notebook.setNotebookOffset(notebook.pagination.offset - notebook.pagination.limit)}
              onNext={() => notebook.setNotebookOffset(notebook.pagination.offset + notebook.pagination.limit)}
            />
          )}
        </div>

        <div className={`${notebook.selectedId ? 'block' : 'hidden xl:block'} xl:sticky xl:top-24 xl:self-start`}>
          {notebook.selectedId && (
            <div className="mb-4 xl:hidden">
              <Button variant="secondary" onClick={() => notebook.setNotebookSelectedOffer('')}>
                ← Back to offers list
              </Button>
            </div>
          )}
          <NotebookOfferDetailsCard
            offer={notebook.selectedOffer}
            history={notebook.historyQuery.data}
            historyError={notebook.historyError}
            updatedAt={notebook.listQuery.dataUpdatedAt}
            isBusy={notebook.isBusy}
            onStatusChange={(status) => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.updateStatus({ id: notebook.selectedOffer.id, status });
            }}
            onSaveMeta={(notes, tags) => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.updateMeta({ id: notebook.selectedOffer.id, notes, tags });
            }}
            onRescore={() => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.rescore({ id: notebook.selectedOffer.id });
            }}
          />
        </div>
      </div>
    </main>
  );
};

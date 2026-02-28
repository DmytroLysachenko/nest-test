'use client';

import { useEffect } from 'react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOfferDetailsCard } from '@/features/job-offers/ui/components/notebook-offer-details-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { useAppUiStore } from '@/shared/store/app-ui-store';

type NotebookPageProps = {
  token: string;
};

export const NotebookPage = ({ token }: NotebookPageProps) => {
  const notebook = useNotebookPage({ token });
  const setLastVisitedSection = useAppUiStore((state) => state.setLastVisitedSection);

  useEffect(() => {
    setLastVisitedSection('notebook');
  }, [setLastVisitedSection]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:py-8">
      <NotebookFiltersCard
        status={notebook.filters.status}
        mode={notebook.filters.mode}
        hasScore={notebook.filters.hasScore}
        tag={notebook.filters.tag}
        search={notebook.filters.search}
        total={notebook.listQuery.data?.total ?? 0}
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

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <NotebookOffersListCard
          offers={notebook.listQuery.data?.items ?? []}
          selectedId={notebook.selectedId}
          offset={notebook.pagination.offset}
          canPrev={notebook.canPrev}
          canNext={notebook.canNext}
          onSelectOffer={notebook.setNotebookSelectedOffer}
          onPrev={() => notebook.setNotebookOffset(notebook.pagination.offset - notebook.pagination.limit)}
          onNext={() => notebook.setNotebookOffset(notebook.pagination.offset + notebook.pagination.limit)}
        />

        <NotebookOfferDetailsCard
          offer={notebook.selectedOffer}
          history={notebook.historyQuery.data}
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
    </main>
  );
};

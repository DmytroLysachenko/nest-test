'use client';

import { LayoutGrid, List } from 'lucide-react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOfferDetailsCard } from '@/features/job-offers/ui/components/notebook-offer-details-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { NotebookPipelineCard } from '@/features/job-offers/ui/components/notebook-pipeline-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { Button } from '@/shared/ui/button';

type NotebookPageProps = {
  token: string;
};

export const NotebookPage = ({ token }: NotebookPageProps) => {
  const notebook = useNotebookPage({ token });

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Triage & Tracking"
        title="Job Notebook"
        subtitle="Review, track and manage your entire application pipeline in one place."
        action={
          <div className="bg-surface-muted border-border/60 flex rounded-2xl border p-1">
            <Button
              variant={notebook.filters.view === 'LIST' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-xl px-3"
              onClick={() => notebook.setNotebookFilter('view', 'LIST')}
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              variant={notebook.filters.view === 'PIPELINE' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-xl px-3"
              onClick={() => notebook.setNotebookFilter('view', 'PIPELINE')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
          </div>
        }
      />

      <NotebookFiltersCard
        status={notebook.filters.status}
        mode={notebook.filters.mode}
        hasScore={notebook.filters.hasScore}
        followUp={notebook.filters.followUp}
        tag={notebook.filters.tag}
        search={notebook.filters.search}
        onStatusChange={(value) => notebook.setNotebookFilter('status', value)}
        onModeChange={(value) => notebook.setNotebookFilter('mode', value)}
        onHasScoreChange={(value) => notebook.setNotebookFilter('hasScore', value)}
        onFollowUpChange={(value) => notebook.setNotebookFilter('followUp', value)}
        onTagChange={(value) => notebook.setNotebookFilter('tag', value)}
        onSearchChange={(value) => notebook.setNotebookFilter('search', value)}
        onResetFilters={notebook.resetNotebookFilters}
        onSavePreset={notebook.saveNotebookFilterPreset}
        onApplyPreset={notebook.applyNotebookFilterPreset}
        hasSavedPreset={Boolean(notebook.savedPreset)}
        activeFilters={notebook.activeFilters}
        total={notebook.listQuery.data?.total ?? 0}
        listUpdatedAt={notebook.listQuery.dataUpdatedAt}
        isBusy={notebook.isBusy}
        summary={notebook.notebookSummary ?? null}
        onQuickAction={notebook.applyQuickAction}
        onEnqueueProfileScrape={() => notebook.enqueueProfileScrapeMutation.mutate()}
        enqueueStatus={notebook.enqueueProfileScrapeMutation.status}
        onDismissAllSeen={notebook.dismissAllSeen}
        onAutoArchive={notebook.autoArchive}
      />

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <div className={notebook.selectedId ? 'hidden xl:block' : 'block'}>
          {notebook.listQuery.isLoading ? (
            <SectionLoadingState title="Offers" description="Loading notebook data..." rows={7} />
          ) : notebook.listError ? (
            <SectionErrorState
              title="Offers"
              message={notebook.listError}
              onRetry={() => {
                void notebook.listQuery.refetch();
              }}
            />
          ) : notebook.filters.view === 'PIPELINE' ? (
            <NotebookPipelineCard
              offers={notebook.listQuery.data?.items ?? []}
              selectedId={notebook.selectedId}
              onSelectOffer={notebook.setNotebookSelectedOffer}
              onUpdateStatus={notebook.updateStatus}
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
            onSavePipeline={(pipelineMeta) => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.updatePipeline({ id: notebook.selectedOffer.id, pipelineMeta });
            }}
            onRescore={() => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.rescore({ id: notebook.selectedOffer.id });
            }}
            onSaveFeedback={(score, notes) => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.updateFeedback({
                id: notebook.selectedOffer.id,
                aiFeedbackScore: score,
                aiFeedbackNotes: notes,
              });
            }}
            onGeneratePrep={(instructions) => {
              if (!notebook.selectedOffer) {
                return;
              }
              notebook.generatePrep({ id: notebook.selectedOffer.id, instructions });
            }}
            isGeneratingPrep={notebook.isGeneratingPrep}
          />
        </div>
      </div>
    </main>
  );
};

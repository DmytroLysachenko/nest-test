'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@repo/ui/components/sheet';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOfferDetailsCard } from '@/features/job-offers/ui/components/notebook-offer-details-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { NotebookPipelineCard } from '@/features/job-offers/ui/components/notebook-pipeline-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { HeroHeader, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel } from '@/shared/ui/guidance-panels';
import { Button } from '@/shared/ui/button';

type NotebookPageProps = {
  token: string;
  initialQuickAction?:
    | 'unscored'
    | 'strictTop'
    | 'saved'
    | 'applied'
    | 'staleUntriaged'
    | 'followUpDue'
    | 'followUpUpcoming'
    | null;
  initialOfferId?: string | null;
};

export const NotebookPage = ({ token, initialQuickAction = null, initialOfferId = null }: NotebookPageProps) => {
  const notebook = useNotebookPage({ token, initialQuickAction, initialOfferId });
  const [isDesktopRail, setIsDesktopRail] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const updateBreakpoint = () => setIsDesktopRail(mediaQuery.matches);

    updateBreakpoint();
    mediaQuery.addEventListener('change', updateBreakpoint);

    return () => {
      mediaQuery.removeEventListener('change', updateBreakpoint);
    };
  }, []);

  const renderOfferWorkspace = () => (
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
  );

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Triage & Tracking"
        title="Job Notebook"
        subtitle="Review fresh offers, move the best ones through your pipeline, and only widen the search when strict matches are exhausted."
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

      <GuidancePanel
        eyebrow="Triage tip"
        title="Start narrow, then widen"
        description="Review strict-top and follow-up-due offers first. Explore mode is useful later, but it should not replace the first-pass workflow for high-signal opportunities."
        tone="info"
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
        hiddenByModeCount={notebook.listQuery.data?.hiddenByModeCount ?? 0}
        listUpdatedAt={notebook.listQuery.dataUpdatedAt}
        isBusy={notebook.isBusy}
        summary={notebook.notebookSummary ?? null}
        onQuickAction={notebook.applyQuickAction}
        onEnqueueProfileScrape={() => notebook.enqueueProfileScrapeMutation.mutate()}
        enqueueStatus={notebook.enqueueProfileScrapeMutation.status}
        onDismissAllSeen={notebook.dismissAllSeen}
        onAutoArchive={notebook.autoArchive}
      />

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div>
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
              hiddenByModeCount={notebook.listQuery.data?.hiddenByModeCount ?? 0}
              degradedResultCount={notebook.listQuery.data?.degradedResultCount ?? 0}
              lastScrapeStatus={notebook.workspaceSummary?.scrape.lastRunStatus ?? null}
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
              onBulkFollowUpSave={(payload) => {
                notebook.bulkUpdateFollowUp(payload);
              }}
              onModeChange={(value) => notebook.setNotebookFilter('mode', value)}
              onOpenPlanning={() => {
                window.location.href = '/planning';
              }}
              onPrev={() => notebook.setNotebookOffset(notebook.pagination.offset - notebook.pagination.limit)}
              onNext={() => notebook.setNotebookOffset(notebook.pagination.offset + notebook.pagination.limit)}
            />
          )}
        </div>

        <div className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
          <UtilityRail
            title={notebook.selectedOffer ? 'Offer workspace' : 'Details rail'}
            description={
              notebook.selectedOffer
                ? 'Keep the selected offer, fit context, and next action in one quieter side workspace.'
                : 'Select an offer to open notes, fit reasoning, and pipeline controls.'
            }
            className="bg-transparent p-0"
          >
            {renderOfferWorkspace()}
          </UtilityRail>
        </div>
      </div>

      {!isDesktopRail ? (
        <Sheet
          open={Boolean(notebook.selectedId)}
          onOpenChange={(open) => (!open ? notebook.setNotebookSelectedOffer(null) : null)}
        >
          <SheetContent side="bottom" className="h-[92vh] rounded-t-[1.8rem] border-none px-0">
            <SheetHeader className="px-5 pb-0 pt-5">
              <SheetTitle>{notebook.selectedOffer?.title ?? 'Offer workspace'}</SheetTitle>
              <SheetDescription>
                Keep the selected offer, fit context, and next action together without losing the notebook list.
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-5 pb-5">
              <UtilityRail
                title={notebook.selectedOffer ? 'Offer workspace' : 'Details rail'}
                description={
                  notebook.selectedOffer
                    ? 'Edit status, follow-up, and notes while keeping the list context in the background.'
                    : 'Select an offer to open notes, fit reasoning, and pipeline controls.'
                }
                className="bg-transparent p-0"
              >
                {renderOfferWorkspace()}
              </UtilityRail>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </main>
  );
};

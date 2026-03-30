'use client';

import React from 'react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOfferDetailsCard } from '@/features/job-offers/ui/components/notebook-offer-details-card';
import { NotebookPipelineCard } from '@/features/job-offers/ui/components/notebook-pipeline-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel } from '@/shared/ui/guidance-panels';

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
    | 'missingNextStep'
    | 'stalePipeline'
    | null;
  initialOfferId?: string | null;
};

export const NotebookPage = ({ token, initialQuickAction = null, initialOfferId = null }: NotebookPageProps) => {
  const notebook = useNotebookPage({ token, initialQuickAction, initialOfferId });
  const pipelineOffers = (notebook.listQuery.data?.items ?? []).filter((offer) =>
    ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'].includes(offer.status),
  );

  const renderOfferWorkspace = () => (
    <NotebookOfferDetailsCard
      offer={notebook.selectedOffer}
      history={notebook.historyQuery.data}
      prepPacket={notebook.prepPacket ?? null}
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
      onCompleteFollowUp={(nextAction) => {
        if (!notebook.selectedOffer) {
          return;
        }
        notebook.completeFollowUp({ id: notebook.selectedOffer.id, nextAction });
      }}
      onSnoozeFollowUp={(durationHours) => {
        if (!notebook.selectedOffer) {
          return;
        }
        notebook.snoozeFollowUp({ id: notebook.selectedOffer.id, durationHours });
      }}
      onClearFollowUp={() => {
        if (!notebook.selectedOffer) {
          return;
        }
        notebook.clearFollowUp({ id: notebook.selectedOffer.id });
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
        eyebrow="Active Workflow"
        title="Notebook Pipeline"
        subtitle="Keep chosen roles moving forward, recover stale applications, and manage follow-up and prep work in one pipeline-first workspace."
      />

      <GuidancePanel
        eyebrow="Pipeline tip"
        title="Use opportunities for review, notebook for active work"
        description="This page is for roles you kept. Review fresh matches in Opportunities, then use this workspace to move saved and applied roles forward or backward as the real process changes."
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

      {notebook.listQuery.isLoading ? (
        <SectionLoadingState title="Pipeline" description="Loading notebook data..." rows={7} />
      ) : notebook.listError ? (
        <SectionErrorState
          title="Pipeline"
          message={notebook.listError}
          onRetry={() => {
            void notebook.listQuery.refetch();
          }}
        />
      ) : (
        <>
          <NotebookPipelineCard
            offers={pipelineOffers}
            selectedId={notebook.selectedId}
            onSelectOffer={notebook.setNotebookSelectedOffer}
            onUpdateStatus={notebook.updateStatus}
          />
          <section className="space-y-3">
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Selected offer workspace</p>
              <p className="text-text-soft mt-1 text-sm">
                Keep more context here than in discovery: notes, next actions, prep packet, and status history.
              </p>
            </div>
            {renderOfferWorkspace()}
          </section>
        </>
      )}
    </main>
  );
};

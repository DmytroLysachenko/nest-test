'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { NotebookPipelineCard } from '@/features/job-offers/ui/components/notebook-pipeline-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { HeroHeader, UtilityRail } from '@/shared/ui/dashboard-primitives';

import type { NotebookQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';

const NotebookOfferDetailsCard = dynamic(
  () =>
    import('@/features/job-offers/ui/components/notebook-offer-details-card').then((module) => ({
      default: module.NotebookOfferDetailsCard,
    })),
  {
    loading: () => <div className="bg-surface-muted h-[32rem] animate-pulse rounded-lg" />,
  },
);

const NotebookActionPlanCard = dynamic(
  () =>
    import('@/features/job-offers/ui/components/notebook-action-plan-card').then((module) => ({
      default: module.NotebookActionPlanCard,
    })),
  {
    loading: () => <div className="bg-surface-muted h-48 animate-pulse rounded-lg" />,
  },
);

type NotebookPageProps = {
  token: string;
  initialQuickAction?: NotebookQuickActionKey | null;
  initialOfferId?: string | null;
  latestUpdateStatus?: string | null;
};

export const NotebookPage = ({
  token,
  initialQuickAction = null,
  initialOfferId = null,
  latestUpdateStatus = null,
}: NotebookPageProps) => {
  const notebook = useNotebookPage({ token, initialQuickAction, initialOfferId });
  const pipelineOffers = (notebook.listQuery.data?.items ?? []).filter((offer) =>
    ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'].includes(offer.status),
  );
  const reminderDeliveryStats = pipelineOffers.reduce(
    (acc, offer) => {
      if (!offer.reminderDelivery) {
        return acc;
      }

      acc[offer.reminderDelivery.state] += 1;
      return acc;
    },
    {
      pending: 0,
      delivered: 0,
      failed: 0,
    },
  );
  const mobileWorkspaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches || !notebook.selectedOffer) {
      return;
    }

    if (typeof mobileWorkspaceRef.current?.scrollIntoView === 'function') {
      mobileWorkspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [notebook.selectedOffer]);

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
    />
  );

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Notebook"
        title="Keep active roles moving"
        subtitle="Track follow-ups, notes, prep work, and status changes for the jobs you decided to pursue."
        action={
          <Link href="/opportunities">
            <Button variant="secondary">Review new roles</Button>
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {notebook.reminderPreview &&
        notebook.reminderPreview.counts.overdue +
          notebook.reminderPreview.counts.today +
          notebook.reminderPreview.counts.upcoming +
          notebook.reminderPreview.counts.stale >
          0 ? (
          <div className="app-surface-elevated grid gap-3 p-4 md:grid-cols-4 md:p-5">
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Overdue</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{notebook.reminderPreview.counts.overdue}</p>
            </div>
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Due today</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{notebook.reminderPreview.counts.today}</p>
            </div>
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Upcoming</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{notebook.reminderPreview.counts.upcoming}</p>
            </div>
            <div>
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Reminder emails</p>
              <p className="text-text-strong mt-2 text-2xl font-semibold">{reminderDeliveryStats.delivered}</p>
              <p className="text-text-soft mt-1 text-xs">
                {reminderDeliveryStats.pending} pending, {reminderDeliveryStats.failed} failed
              </p>
            </div>
          </div>
        ) : (
          <div className="app-surface-elevated p-5">
            <p className="text-text-strong text-sm font-semibold">No urgent reminder cluster right now.</p>
            <p className="text-text-soft mt-2 text-sm">
              Use the board and selected workspace below to keep active roles current before they become stale.
            </p>
          </div>
        )}

        <UtilityRail
          title="Keep notebook singular"
          description="This route owns active application work only."
          className="app-surface-elevated p-5 md:p-6"
        >
          <div className="space-y-3 text-sm">
            <div className="border-border/60 border-b pb-3">
              <p className="text-text-strong font-semibold">Do here</p>
              <p className="text-text-soft mt-2">
                Save notes, set next steps, plan follow-ups, move statuses, and generate prep for live roles.
              </p>
            </div>
            <div className="border-border/60 border-b pb-3">
              <p className="text-text-strong font-semibold">Do elsewhere</p>
              <p className="text-text-soft mt-2">
                Review fresh matches in opportunities and manage update cadence in planning.
              </p>
            </div>
            <div>
              <p className="text-text-strong font-semibold">Current active roles</p>
              <p className="text-text-soft mt-2">
                {pipelineOffers.length} roles are currently in the notebook pipeline.
              </p>
            </div>
          </div>
        </UtilityRail>
      </section>

      <NotebookActionPlanCard
        actionPlan={notebook.actionPlan ?? null}
        selectedOffer={notebook.selectedOffer}
        prepPacket={notebook.prepPacket ?? null}
        isBusy={notebook.isBusy}
        onOpenQueue={notebook.applyQuickAction}
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
        onGeneratePrep={({ id, instructions }) => notebook.generatePrep({ id, instructions })}
      />

      <NotebookFiltersCard
        variant="pipeline"
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
          <NotebookOffersListCard
            offers={pipelineOffers}
            hiddenByModeCount={0}
            degradedResultCount={
              pipelineOffers.filter((offer) =>
                offer.attentionSignals?.some((signal) => signal.key === 'prep_recommended'),
              ).length
            }
            lastScrapeStatus={latestUpdateStatus}
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
            onSelectAllVisible={() => notebook.setNotebookSelectedOfferIds(pipelineOffers.map((offer) => offer.id))}
            onClearSelected={notebook.clearNotebookSelectedOfferIds}
            onBulkStatusChange={(status) => notebook.bulkUpdateStatus({ ids: notebook.selectedOfferIds, status })}
            onBulkFollowUpSave={notebook.bulkUpdateFollowUp}
            onBulkWorkflowSave={notebook.bulkUpdateWorkflow}
            onBulkSnooze={(durationHours) =>
              notebook.selectedOfferIds.forEach((id) => notebook.snoozeFollowUp({ id, durationHours }))
            }
            onBulkClearFollowUp={() => notebook.selectedOfferIds.forEach((id) => notebook.clearFollowUp({ id }))}
            onPrev={() => notebook.setNotebookOffset(notebook.pagination.offset - notebook.pagination.limit)}
            onNext={() => notebook.setNotebookOffset(notebook.pagination.offset + notebook.pagination.limit)}
          />
          <section ref={mobileWorkspaceRef} className="space-y-3">
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

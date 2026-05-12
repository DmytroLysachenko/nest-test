'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowRight, Clock3, MailWarning } from 'lucide-react';

import { useNotebookPage } from '@/features/job-offers/model/use-notebook-page';
import { NotebookFiltersCard } from '@/features/job-offers/ui/components/notebook-filters-card';
import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import { NotebookPipelineCard } from '@/features/job-offers/ui/components/notebook-pipeline-card';
import { SectionErrorState, SectionLoadingState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { HeroHeader, UtilityRail } from '@/shared/ui/dashboard-primitives';
import { formatDateTime } from '@/shared/lib/utils/date-format';

import type { NotebookQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';
import type { JobOfferReminderPreviewDto } from '@/shared/types/api';

type NotebookSignalPanelProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeClassName?: string;
  previewTitle?: string | null;
  previewMeta?: string | null;
  actions: React.ReactNode;
};

const NotebookOfferDetailsCard = dynamic(
  () =>
    import('@/features/job-offers/ui/components/notebook-offer-details-card').then((module) => ({
      default: module.NotebookOfferDetailsCard,
    })),
  {
    loading: () => <div className="app-tonal-section h-[32rem] animate-pulse" />,
  },
);

const NotebookActionPlanCard = dynamic(
  () =>
    import('@/features/job-offers/ui/components/notebook-action-plan-card').then((module) => ({
      default: module.NotebookActionPlanCard,
    })),
  {
    loading: () => <div className="app-tonal-section h-48 animate-pulse" />,
  },
);

const NotebookSignalPanel = ({
  icon,
  title,
  description,
  badge,
  badgeClassName,
  previewTitle,
  previewMeta,
  actions,
}: NotebookSignalPanelProps) => (
  <section className="app-tonal-section space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-text-strong text-sm font-semibold">{title}</p>
        </div>
        <p className="text-text-soft text-sm">{description}</p>
      </div>
      <span className={badgeClassName ?? 'app-badge'}>{badge}</span>
    </div>
    {previewTitle ? (
      <div className="app-open-section border-border/40 border-t pt-3">
        <p className="text-text-strong text-sm font-semibold">{previewTitle}</p>
        {previewMeta ? <p className="text-text-soft mt-1 text-sm">{previewMeta}</p> : null}
      </div>
    ) : null}
    <div className="flex flex-wrap gap-2">{actions}</div>
  </section>
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
  const pipelineOffers = notebook.fullPipelineQuery.data?.items ?? [];
  const queueOffers = notebook.queueQuery.data?.items ?? [];
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
  const reminderBucketQuickActions: Record<
    JobOfferReminderPreviewDto['buckets'][number]['key'],
    NotebookQuickActionKey
  > = {
    overdue: 'followUpDue',
    today: 'followUpDueToday',
    upcoming: 'followUpUpcoming',
    stale: 'stalePipeline',
  };
  const failedReminderOffers = pipelineOffers.filter((offer) => offer.reminderDelivery?.state === 'failed');
  const stalePipelineOffers = pipelineOffers.filter((offer) =>
    offer.attentionSignals?.some((signal) => signal.key === 'stale_pipeline'),
  );
  const missingNextStepOffers = pipelineOffers.filter((offer) =>
    offer.attentionSignals?.some((signal) => signal.key === 'missing_next_step'),
  );
  const reminderBuckets = notebook.reminderPreview?.buckets.filter((bucket) => bucket.count > 0) ?? [];

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
      updatedAt={notebook.fullPipelineQuery.dataUpdatedAt}
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
        title="Keep active roles moving"
        subtitle="Track follow-ups, notes, prep work, and status changes for the jobs you decided to pursue."
        action={
          <Link href="/opportunities">
            <Button variant="secondary">Review new roles</Button>
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        {notebook.reminderPreview &&
        notebook.reminderPreview.counts.overdue +
          notebook.reminderPreview.counts.today +
          notebook.reminderPreview.counts.upcoming +
          notebook.reminderPreview.counts.stale >
          0 ? (
          <div className="app-tonal-section grid gap-3 md:grid-cols-4">
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
          <div className="app-tonal-section">
            <p className="text-text-strong text-sm font-semibold">No urgent reminder cluster right now.</p>
            <p className="text-text-soft mt-2 text-sm">
              Use the board and selected workspace below to keep active roles current before they become stale.
            </p>
          </div>
        )}

        <UtilityRail
          title="Keep notebook singular"
          description="This route owns active application work only."
          className="xl:sticky xl:top-24"
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

      {reminderBuckets.length ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {reminderBuckets.map((bucket) => (
            <section key={bucket.key} className="app-tonal-section space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">{bucket.label}</p>
                  <p className="text-text-strong mt-2 text-lg font-semibold">{bucket.count} roles need this pass</p>
                </div>
                <span className="app-badge">{bucket.count}</span>
              </div>
              {bucket.items[0] ? (
                <div className="app-open-section border-border/40 border-t pt-3">
                  <p className="text-text-strong text-sm font-semibold">{bucket.items[0].title}</p>
                  <p className="text-text-soft mt-1 text-sm">
                    {bucket.items[0].company ?? 'Unknown company'}
                    {bucket.items[0].nextStep ? ` | ${bucket.items[0].nextStep}` : ''}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => notebook.applyQuickAction(reminderBucketQuickActions[bucket.key])}
                >
                  Open queue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
                {bucket.key === 'today' || bucket.key === 'upcoming' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => notebook.applyQuickAction('prepRecommended')}
                  >
                    Prep next replies
                  </Button>
                ) : null}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {failedReminderOffers.length ? (
        <NotebookSignalPanel
          icon={<MailWarning className="text-app-danger h-4 w-4" />}
          title="Reminder delivery needs recovery"
          description={`${failedReminderOffers.length} active roles failed external email delivery. Notebook follow-up still exists here.`}
          badge={`${failedReminderOffers.length} failed`}
          badgeClassName="app-badge border-app-danger-border bg-app-danger-soft text-app-danger"
          previewTitle="Recovery path"
          previewMeta="Work overdue queue in notebook first. If mail failed, reschedule or complete follow-up from selected workspace instead of waiting on email."
          actions={
            <>
              <Button type="button" size="sm" onClick={() => notebook.applyQuickAction('followUpDue')}>
                Open overdue roles
              </Button>
              <Link href="/planning">
                <Button type="button" size="sm" variant="secondary">
                  Check automation
                </Button>
              </Link>
            </>
          }
        />
      ) : null}

      {stalePipelineOffers.length || missingNextStepOffers.length ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {stalePipelineOffers.length ? (
            <NotebookSignalPanel
              icon={<Clock3 className="text-app-warning h-4 w-4" />}
              title="Stale roles need a recovery pass"
              description={`${stalePipelineOffers.length} active roles are drifting without a fresh touch or decision checkpoint.`}
              badge={`${stalePipelineOffers.length} stale`}
              badgeClassName="app-badge border-app-warning-border bg-app-warning-soft text-app-warning"
              previewTitle={stalePipelineOffers[0]?.title ?? null}
              previewMeta={
                stalePipelineOffers[0]
                  ? `${stalePipelineOffers[0].company ?? 'Unknown company'}${stalePipelineOffers[0].nextStep ? ` | ${stalePipelineOffers[0].nextStep}` : ''}`
                  : null
              }
              actions={
                <>
                  <Button type="button" size="sm" onClick={() => notebook.applyQuickAction('stalePipeline')}>
                    Open stale queue
                  </Button>
                  {stalePipelineOffers[0] ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => notebook.setNotebookSelectedOffer(stalePipelineOffers[0]?.id ?? null)}
                    >
                      Open first stale role
                    </Button>
                  ) : null}
                </>
              }
            />
          ) : null}

          {missingNextStepOffers.length ? (
            <NotebookSignalPanel
              icon={<ArrowRight className="text-primary h-4 w-4" />}
              title="Missing next-step cleanup"
              description={`${missingNextStepOffers.length} roles still need a concrete next move attached in the notebook.`}
              badge={`${missingNextStepOffers.length} missing next step`}
              previewTitle={missingNextStepOffers[0]?.title ?? null}
              previewMeta={
                missingNextStepOffers[0]
                  ? `${missingNextStepOffers[0].company ?? 'Unknown company'}${missingNextStepOffers[0].followUpAt ? ` | ${formatDateTime(missingNextStepOffers[0].followUpAt)}` : ''}`
                  : null
              }
              actions={
                <>
                  {missingNextStepOffers[0] ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => notebook.setNotebookSelectedOffer(missingNextStepOffers[0]?.id ?? null)}
                    >
                      Open first gap
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => notebook.applyQuickAction('followUpDue')}
                  >
                    Work due queue
                  </Button>
                </>
              }
            />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="app-open-section border-border/45 border-b pb-3">
          <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Action plan</p>
          <p className="text-text-soft mt-1 text-sm">
            Keep next moves, reminder planning, and prep generation visible before diving into one role.
          </p>
        </div>
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
      </section>

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
        total={notebook.queueQuery.data?.total ?? 0}
        hiddenByModeCount={notebook.queueQuery.data?.hiddenByModeCount ?? 0}
        listUpdatedAt={notebook.queueQuery.dataUpdatedAt}
        isBusy={notebook.isBusy}
        summary={notebook.notebookSummary ?? null}
        onQuickAction={notebook.applyQuickAction}
        onDismissAllSeen={notebook.dismissAllSeen}
        onAutoArchive={notebook.autoArchive}
      />

      {notebook.fullPipelineQuery.isLoading || notebook.queueQuery.isLoading ? (
        <SectionLoadingState title="Pipeline" description="Loading notebook data..." rows={7} />
      ) : notebook.listError ? (
        <SectionErrorState
          title="Pipeline"
          message={notebook.listError}
          onRetry={() => {
            void Promise.all([notebook.fullPipelineQuery.refetch(), notebook.queueQuery.refetch()]);
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:items-start">
            <NotebookOffersListCard
              offers={queueOffers}
              hiddenByModeCount={notebook.queueQuery.data?.hiddenByModeCount ?? 0}
              degradedResultCount={
                queueOffers.filter((offer) =>
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
              onSelectAllVisible={() => notebook.setNotebookSelectedOfferIds(queueOffers.map((offer) => offer.id))}
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
            <section ref={mobileWorkspaceRef} className="space-y-3 xl:sticky xl:top-24">
              <div className="app-open-section border-border/45 border-b pb-3">
                <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Selected offer workspace</p>
                <p className="text-text-soft mt-1 text-sm">
                  Keep more context here than in discovery: notes, next actions, prep packet, and status history.
                </p>
              </div>
              {renderOfferWorkspace()}
            </section>
          </div>
        </>
      )}
    </main>
  );
};

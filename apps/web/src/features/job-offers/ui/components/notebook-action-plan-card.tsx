'use client';

import { AlarmClockCheck, ArrowRight, CalendarClock, CircleAlert, FileClock, RefreshCw } from 'lucide-react';

import { notebookActionPlanQuickActions } from '@/features/job-offers/model/utils/notebook-filter-utils';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

import type { JobOfferActionPlanDto, JobOfferListItemDto, JobOfferPrepPacketDto } from '@/shared/types/api';
import type { NotebookQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';

type NotebookActionPlanCardProps = {
  actionPlan: JobOfferActionPlanDto | null | undefined;
  selectedOffer: JobOfferListItemDto | null;
  prepPacket: JobOfferPrepPacketDto | null;
  isBusy: boolean;
  onOpenQueue: (action: NotebookQuickActionKey) => void;
  onCompleteFollowUp: (nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week') => void;
  onSnoozeFollowUp: (durationHours: number) => void;
  onGeneratePrep: (payload: { id: string; instructions?: string }) => void;
};

const priorityToneClass = {
  critical: 'border-app-danger-border bg-app-danger-soft text-app-danger',
  recommended: 'border-app-warning-border bg-app-warning-soft text-app-warning',
  info: 'border-primary/20 bg-primary/5 text-primary',
} as const;

const priorityIcon = {
  critical: CircleAlert,
  recommended: CalendarClock,
  info: FileClock,
} as const;

const selectedOfferNeedsFollowUp = (offer: JobOfferListItemDto | null) =>
  offer?.followUpState === 'due' || offer?.followUpState === 'upcoming';

export const NotebookActionPlanCard = ({
  actionPlan,
  selectedOffer,
  prepPacket,
  isBusy,
  onOpenQueue,
  onCompleteFollowUp,
  onSnoozeFollowUp,
  onGeneratePrep,
}: NotebookActionPlanCardProps) => {
  const visibleBuckets =
    actionPlan?.buckets
      .filter((bucket) => bucket.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, 4) ?? [];
  const showSelectedOfferActions = Boolean(selectedOffer) && selectedOfferNeedsFollowUp(selectedOffer);
  const showPrepAction =
    Boolean(selectedOffer) &&
    selectedOffer?.attentionSignals?.some((signal) => signal.key === 'prep_recommended') &&
    !prepPacket;

  return (
    <Card
      title="Today plan"
      description="Work the active funnel in the order that prevents drift: due, today, stale, then everything else."
    >
      <div className="space-y-4">
        {visibleBuckets.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleBuckets.map((bucket) => {
              const tone = bucket.priority ?? 'info';
              const Icon = priorityIcon[tone];
              const quickAction =
                notebookActionPlanQuickActions[bucket.key as keyof typeof notebookActionPlanQuickActions];

              return (
                <div key={bucket.key} className="app-muted-panel space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`app-badge ${priorityToneClass[tone]}`}>{bucket.label}</span>
                        <span className="app-badge">{bucket.count}</span>
                      </div>
                      <p className="text-text-strong text-sm font-semibold">{bucket.description}</p>
                    </div>
                    <div className={`rounded-2xl p-2 ${priorityToneClass[tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  {bucket.reasons?.length ? <p className="text-text-soft text-sm">{bucket.reasons[0]}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {quickAction ? (
                      <Button type="button" size="sm" disabled={isBusy} onClick={() => onOpenQueue(quickAction)}>
                        {bucket.ctaLabel}
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="app-muted-panel">
            <p className="text-text-strong text-sm font-semibold">No active action buckets right now.</p>
            <p className="text-text-soft mt-1 text-sm">
              The pipeline is clear enough that you can review roles normally instead of working an urgent queue.
            </p>
          </div>
        )}

        {showSelectedOfferActions || showPrepAction ? (
          <div className="app-inset-stack space-y-3">
            <div className="space-y-1">
              <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Selected offer shortcuts</p>
              <p className="text-text-strong text-sm font-semibold">
                Use one-click actions when the current role already has an obvious next move.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showSelectedOfferActions ? (
                <>
                  <Button type="button" size="sm" disabled={isBusy} onClick={() => onCompleteFollowUp('tomorrow')}>
                    <AlarmClockCheck className="mr-2 h-3.5 w-3.5" />
                    Done, remind tomorrow
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => onSnoozeFollowUp(24)}
                  >
                    Snooze 1 day
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => onSnoozeFollowUp(168)}
                  >
                    Snooze 1 week
                  </Button>
                </>
              ) : null}
              {showPrepAction && selectedOffer ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() =>
                    onGeneratePrep({
                      id: selectedOffer.id,
                      instructions: 'Focus on the next reply or interview step for this active role.',
                    })
                  }
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Generate prep now
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

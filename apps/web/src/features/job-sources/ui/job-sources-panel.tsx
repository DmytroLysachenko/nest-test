'use client';

import { useRouter } from 'next/navigation';
import { CalendarClock, PlayCircle, Radar, TriangleAlert } from 'lucide-react';

import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';
import {
  getAutomationLastUpdateSummary,
  getAutomationPresetSummary,
  getRunMatchingPresentation,
  getScheduleEventPresentation,
} from '@/shared/lib/presentation/job-search-ui';
import { formatDateTime } from '@/shared/lib/utils/date-format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

type JobSourcesPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const JobSourcesPanel = ({ token, disabled = false, disabledReason }: JobSourcesPanelProps) => {
  const router = useRouter();
  const jobSourcesPanel = useJobSourcesPanel(token);
  const {
    register,
    formState: { errors },
  } = jobSourcesPanel.form;
  const {
    register: registerSchedule,
    formState: { errors: scheduleErrors },
  } = jobSourcesPanel.scheduleForm;
  const preflight = jobSourcesPanel.preflightQuery.data;
  const scheduleEvents = jobSourcesPanel.scheduleEvents ?? [];
  const recentRuns = jobSourcesPanel.recentRuns ?? [];
  const now = Date.now();
  const nextRunAtValue = jobSourcesPanel.scheduleResult?.nextRunAt
    ? new Date(jobSourcesPanel.scheduleResult.nextRunAt).getTime()
    : null;
  const lastTriggeredAtValue = jobSourcesPanel.scheduleResult?.lastTriggeredAt
    ? new Date(jobSourcesPanel.scheduleResult.lastTriggeredAt).getTime()
    : null;
  const scheduleIsDue = typeof nextRunAtValue === 'number' && nextRunAtValue <= now;
  const lastScheduleFailure = scheduleEvents.find((event) => event.severity === 'error');
  const lastScheduleSuccess = scheduleEvents.find((event) => event.eventType === 'schedule_enqueue_succeeded');
  const provenScheduledAt = jobSourcesPanel.scheduleResult?.lastSuccessfulScheduledAt;
  const trustEvidenceLabel = lastScheduleSuccess
    ? `Last proven enqueue ${formatDateTime(lastScheduleSuccess.createdAt)}`
    : provenScheduledAt
      ? `Last proven scheduled enqueue ${formatDateTime(provenScheduledAt)}`
      : typeof lastTriggeredAtValue === 'number'
        ? `Last automatic trigger recorded ${formatDateTime(jobSourcesPanel.scheduleResult?.lastTriggeredAt)}`
        : 'No successful scheduled enqueue recorded yet';

  const scheduleStory = !jobSourcesPanel.scheduleResult?.enabled
    ? {
        tone: 'neutral' as const,
        title: 'Automatic updates are off',
        description: 'Use manual updates until your targeting feels stable.',
      }
    : jobSourcesPanel.scheduleResult?.lastRunStatus === 'FAILED'
      ? {
          tone: 'danger' as const,
          title: 'The last automatic update needs attention',
          description:
            'The last automatic update did not finish cleanly. Check your setup and try another refresh when you are ready.',
        }
      : typeof lastTriggeredAtValue !== 'number' && !lastScheduleSuccess && !provenScheduledAt
        ? {
            tone: 'warning' as const,
            title: 'Automatic updates are on but not proven yet',
            description: 'Schedule is saved. First successful scheduled enqueue has not been recorded yet.',
          }
        : scheduleIsDue
          ? {
              tone: 'warning' as const,
              title: 'Next update window has passed',
              description:
                'Confirm recent schedule events. If no enqueue evidence appears, run one update now and inspect automation state.',
            }
          : {
              tone: 'positive' as const,
              title: 'Automatic updates are working',
              description: 'Schedule is on, next update window is ahead, and recent enqueue evidence exists.',
            };

  const getStoryTone = (value?: 'positive' | 'warning' | 'danger' | 'neutral') => {
    if (value === 'positive') {
      return 'border-app-success-border bg-app-success-soft';
    }
    if (value === 'danger') {
      return 'border-app-danger-border bg-app-danger-soft';
    }
    if (value === 'warning') {
      return 'border-app-warning-border bg-app-warning-soft';
    }
    return 'border-border/60 bg-surface/70';
  };

  return (
    <Card
      title="Update jobs automatically"
      description="Choose whether to refresh manually or let the app bring in new roles on a simple schedule."
      className="overflow-hidden"
    >
      <div className="app-tonal-section grid gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <div className="mb-3 flex items-center gap-2">
            <PlayCircle className="text-primary h-4 w-4" />
            <p className="text-text-strong text-sm font-semibold">Run now</p>
          </div>
          <p className="text-text-soft text-sm leading-6">
            Use this after changing your profile, documents, or search direction.
          </p>
        </div>
        <div className="border-border/45 space-y-3 md:border-l md:pl-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="text-text-strong h-4 w-4" />
            <p className="text-text-strong text-sm font-semibold">Keep it automatic</p>
          </div>
          <p className="text-text-soft text-sm leading-6">
            Turn the schedule on once the search target is stable and you want regular refreshes.
          </p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobSourcesPanel.submit(event);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="app-badge">One-time update</span>
          <span className="text-text-soft text-xs">Starts a single search refresh immediately.</span>
        </div>
        <div className="app-field-group">
          <Label htmlFor="scrape-mode" className="app-inline-label">
            Update source
          </Label>
          <select id="scrape-mode" className="app-select" {...register('mode')}>
            <option value="profile">Use my saved profile and filters</option>
            <option value="custom">Use a custom listing URL once</option>
          </select>
        </div>

        <div className="app-field-group">
          <Label htmlFor="listing-url" className="app-inline-label">
            Listing URL
          </Label>
          <Input
            id="listing-url"
            placeholder="https://it.pracuj.pl/praca?..."
            disabled={jobSourcesPanel.mode !== 'custom'}
            {...register('listingUrl')}
          />
          <p className="text-text-soft text-xs">
            Leave this off for the normal profile-driven flow. Use it only for a one-time custom check.
          </p>
          {errors.listingUrl?.message ? (
            <WorkflowInlineNotice
              title="Listing URL needs correction"
              description={errors.listingUrl.message}
              tone="danger"
            />
          ) : null}
        </div>

        <div className="app-field-group">
          <Label htmlFor="listing-limit" className="app-inline-label">
            How many roles to pull
          </Label>
          <Input id="listing-limit" type="number" min={1} max={100} {...register('limit')} />
          {errors.limit?.message ? (
            <WorkflowInlineNotice
              title="Update size needs correction"
              description={errors.limit.message}
              tone="danger"
            />
          ) : null}
        </div>

        {preflight && !preflight.ready ? (
          <WorkflowInlineNotice
            title="Finish setup before running an update"
            description={preflight.guidance}
            tone="warning"
          />
        ) : null}

        {preflight?.blockerDetails.length ? (
          <div className="space-y-2">
            {preflight.blockerDetails.map((blocker) => (
              <WorkflowFeedback
                key={blocker.code}
                title={blocker.title}
                description={blocker.description}
                tone="warning"
                actionLabel={blocker.ctaLabel}
                onAction={() => router.push(blocker.href)}
              />
            ))}
          </div>
        ) : null}

        {errors.root?.message ? (
          <WorkflowFeedback title="Unable to start the update" description={errors.root.message} tone="danger" />
        ) : null}

        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? (
            <WorkflowInlineNotice
              title="Updates are temporarily unavailable"
              description={disabledReason}
              tone="warning"
            />
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={disabled || jobSourcesPanel.isSubmitting || Boolean(preflight && !preflight.ready)}
          >
            {jobSourcesPanel.isSubmitting ? 'Starting update...' : 'Run update now'}
          </Button>
        </div>
      </form>

      {jobSourcesPanel.enqueueResult ? (
        <div className="border-app-success-border bg-app-success-soft mt-4 rounded-[1.25rem] border px-4 py-3.5">
          <p className="text-text-strong font-semibold">Update request accepted</p>
          <p className="text-text-soft mt-1 text-sm">
            A new refresh is queued. You can keep working while the new results arrive.
          </p>
        </div>
      ) : null}

      <div className="border-border/55 bg-surface-elevated/82 mt-5 rounded-[1.25rem] border px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-text-strong text-sm font-semibold">Rebuild opportunities from recent catalog</p>
            <p className="text-text-soft text-sm leading-6">
              Use this when a scrape finished but your discovery or notebook stayed empty. It relinks recent shared
              catalog offers to your workflow without waiting for another worker run.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || jobSourcesPanel.isRepairingCatalog}
            onClick={() => jobSourcesPanel.rematchNow()}
          >
            {jobSourcesPanel.isRepairingCatalog ? 'Rebuilding...' : 'Rebuild opportunities'}
          </Button>
        </div>
      </div>

      <div className="border-border/55 bg-surface-elevated/82 mt-5 rounded-[1.25rem] border px-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-text-strong text-sm font-semibold">Recent update results</p>
            <p className="text-text-soft text-sm leading-6">
              This proves whether a scrape only ran, or also reached your workflow as visible opportunities.
            </p>
          </div>
          {recentRuns.some((run) => run.matchingState === 'deferred') ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || jobSourcesPanel.isRepairingCatalog}
              onClick={() => jobSourcesPanel.rematchNow()}
            >
              {jobSourcesPanel.isRepairingCatalog ? 'Rebuilding...' : 'Repair deferred linking'}
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {recentRuns.length ? (
            recentRuns.map((run) => {
              const matching = getRunMatchingPresentation(run);
              const toneClass =
                matching.tone === 'positive'
                  ? 'border-app-success-border bg-app-success-soft'
                  : matching.tone === 'warning'
                    ? 'border-app-warning-border bg-app-warning-soft'
                    : 'border-border/60 bg-surface/70';

              return (
                <div key={run.id} className={`rounded-[1.2rem] border px-4 py-3 ${toneClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-text-strong text-sm font-semibold">{matching.label}</p>
                      <p className="text-text-soft text-sm">{matching.summary}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-text-strong text-xs font-semibold uppercase tracking-[0.16em]">{run.status}</p>
                      <p className="text-text-soft mt-1 text-xs">{formatDateTime(run.finalizedAt ?? run.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="app-muted-panel">
                      <p className="text-text-soft text-[11px] uppercase tracking-[0.16em]">Candidates</p>
                      <p className="text-text-strong mt-2 text-base font-semibold">{run.candidateOffers ?? 0}</p>
                    </div>
                    <div className="app-muted-panel">
                      <p className="text-text-soft text-[11px] uppercase tracking-[0.16em]">Matched</p>
                      <p className="text-text-strong mt-2 text-base font-semibold">{run.matchedOffers ?? 0}</p>
                    </div>
                    <div className="app-muted-panel">
                      <p className="text-text-soft text-[11px] uppercase tracking-[0.16em]">Linked to workflow</p>
                      <p className="text-text-strong mt-2 text-base font-semibold">{run.linkedNotebookOffers ?? 0}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <WorkflowInlineNotice
              title="No recent user-visible run evidence yet"
              description="Run one manual update to create the first scrape, matching, and workflow delivery trail."
              tone="info"
            />
          )}
        </div>
      </div>

      <form className="app-tonal-section mt-5 space-y-4" onSubmit={jobSourcesPanel.submitSchedule}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Radar className="text-primary h-4 w-4" />
              <p className="text-text-strong text-sm font-semibold">Automatic updates</p>
            </div>
            <p className="text-text-soft text-xs">Keep this simple unless you truly need a custom cadence.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...registerSchedule('enabled')} />
            Turn on
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('weekdays-morning')}
          >
            Weekdays 08:00
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('daily-evening')}
          >
            Daily 18:00
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => jobSourcesPanel.applySchedulePreset('paused')}
          >
            Pause
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-field-group">
            <Label htmlFor="schedule-cron" className="app-inline-label">
              Custom schedule
            </Label>
            <Input id="schedule-cron" placeholder="0 9 * * *" {...registerSchedule('cron')} />
            <p className="text-text-soft text-xs">
              Leave the preset if that is enough. Use a custom rule only if needed.
            </p>
            {scheduleErrors.cron?.message ? (
              <WorkflowInlineNotice
                title="Schedule rule needs correction"
                description={scheduleErrors.cron.message}
                tone="danger"
              />
            ) : null}
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-timezone" className="app-inline-label">
              Timezone
            </Label>
            <Input id="schedule-timezone" placeholder="Europe/Warsaw" {...registerSchedule('timezone')} />
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-source" className="app-inline-label">
              Default source
            </Label>
            <select id="schedule-source" className="app-select" {...registerSchedule('source')}>
              <option value="pracuj-pl-it">Pracuj IT</option>
              <option value="pracuj-pl">Pracuj generic</option>
              <option value="pracuj-pl-general">Pracuj general</option>
            </select>
          </div>

          <div className="app-field-group">
            <Label htmlFor="schedule-limit" className="app-inline-label">
              Roles per update
            </Label>
            <Input id="schedule-limit" type="number" min={1} max={100} {...registerSchedule('limit')} />
            {scheduleErrors.limit?.message ? (
              <WorkflowInlineNotice
                title="Roles per update needs correction"
                description={scheduleErrors.limit.message}
                tone="danger"
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Current schedule</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {getAutomationPresetSummary(
                jobSourcesPanel.scheduleResult?.cron,
                jobSourcesPanel.scheduleResult?.enabled,
              )}
            </p>
          </div>
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last update</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {getAutomationLastUpdateSummary(jobSourcesPanel.scheduleResult?.lastRunStatus)}
            </p>
            <p className="text-text-soft mt-1 text-xs">
              {formatDateTime(
                jobSourcesPanel.scheduleResult?.lastSuccessfulScheduledAt ??
                  jobSourcesPanel.scheduleResult?.lastTriggeredAt,
              )}
            </p>
          </div>
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Next update</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {formatDateTime(jobSourcesPanel.scheduleResult?.nextRunAt)}
            </p>
          </div>
        </div>

        <div className={`rounded-[1.2rem] border px-4 py-3 ${getStoryTone(scheduleStory.tone)}`}>
          <p className="text-text-strong font-semibold">{scheduleStory.title}</p>
          <p className="text-text-soft mt-1">{scheduleStory.description}</p>
          <p className="text-text-soft mt-2 text-xs">{trustEvidenceLabel}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-text-soft text-xs">
            Saving updates the schedule only. Use the second button if you want to start it right away.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={jobSourcesPanel.isSavingSchedule}>
              {jobSourcesPanel.isSavingSchedule ? 'Saving...' : 'Save schedule'}
            </Button>
            <Button
              type="button"
              disabled={!jobSourcesPanel.scheduleResult?.enabled || jobSourcesPanel.isTriggeringSchedule}
              onClick={() => jobSourcesPanel.triggerScheduleNow()}
            >
              {jobSourcesPanel.isTriggeringSchedule ? 'Starting...' : 'Run scheduled update now'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <WorkflowInlineNotice
            title="How to use this page"
            description="Set the schedule, confirm when the last update happened, and then do your actual review work in Opportunities or Notebook."
            tone="info"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radar className="text-primary h-4 w-4" />
            <p className="text-text-strong text-sm font-semibold">Recent automation evidence</p>
          </div>
          {lastScheduleFailure ? (
            <WorkflowInlineNotice
              title="Latest scheduled enqueue failed"
              description={lastScheduleFailure.message}
              tone="danger"
            />
          ) : null}
          {scheduleEvents.length ? (
            <div className="space-y-2">
              {scheduleEvents.map((event) => {
                const presentation = getScheduleEventPresentation(event);
                const toneClass =
                  event.severity === 'error'
                    ? 'border-app-danger-border bg-app-danger-soft'
                    : event.severity === 'warning'
                      ? 'border-app-warning-border bg-app-warning-soft'
                      : 'border-border/60 bg-surface/70';

                return (
                  <div key={event.id} className={`rounded-[1.2rem] border px-4 py-3 ${toneClass}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-text-strong text-sm font-semibold">{presentation.label}</p>
                        <p className="text-text-soft mt-1 text-sm">{presentation.summary}</p>
                      </div>
                      <p className="text-text-soft text-xs">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="app-muted-panel flex items-start gap-3">
              <TriangleAlert className="text-app-warning mt-0.5 h-4 w-4" />
              <div>
                <p className="text-text-strong text-sm font-semibold">No recent schedule events yet</p>
                <p className="text-text-soft mt-1 text-sm">
                  Save schedule, then wait for next window or run one immediate update to create baseline evidence.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
};

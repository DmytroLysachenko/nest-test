'use client';

import { useRouter } from 'next/navigation';
import { CalendarClock, PlayCircle, Radar } from 'lucide-react';

import { useJobSourcesPanel } from '@/features/job-sources/model/hooks/use-job-sources-panel';
import {
  getScheduleEventPresentation,
  getSchedulePresetLabel,
  getUserFacingRunStatus,
} from '@/shared/lib/presentation/job-search-ui';
import { formatDateTime } from '@/shared/lib/utils/date-format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
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
  const sourceHealth = jobSourcesPanel.sourceHealthQuery.data?.items?.[0] ?? null;
  const scheduleEvents = jobSourcesPanel.scheduleEventsQuery.data?.items ?? [];
  const recentRuns = jobSourcesPanel.runsQuery.data?.items ?? [];
  const usableRunRate = typeof sourceHealth?.usableRunRate === 'number' ? sourceHealth.usableRunRate : null;
  const now = Date.now();
  const nextRunAtValue = jobSourcesPanel.scheduleResult?.nextRunAt
    ? new Date(jobSourcesPanel.scheduleResult.nextRunAt).getTime()
    : null;
  const lastTriggeredAtValue = jobSourcesPanel.scheduleResult?.lastTriggeredAt
    ? new Date(jobSourcesPanel.scheduleResult.lastTriggeredAt).getTime()
    : null;
  const scheduleIsDue = typeof nextRunAtValue === 'number' && nextRunAtValue <= now;
  const latestScheduleSuccess =
    scheduleEvents.find((event) => event.eventType === 'schedule_enqueue_succeeded') ?? null;
  const latestScheduleFailure =
    scheduleEvents.find((event) => event.severity === 'error' || event.eventType === 'schedule_enqueue_failed') ?? null;

  const scheduleStory = !jobSourcesPanel.scheduleResult?.enabled
    ? {
        tone: 'neutral' as const,
        title: 'Automatic updates are off',
        description: 'Use manual updates until your targeting feels stable.',
      }
    : sourceHealth?.activePause
      ? {
          tone: 'warning' as const,
          title: scheduleIsDue ? 'An update is due but paused' : 'Automatic updates are paused',
          description: sourceHealth.guidance,
        }
      : jobSourcesPanel.scheduleResult?.lastRunStatus === 'FAILED' || latestScheduleFailure
        ? {
            tone: 'danger' as const,
            title: 'Recent automatic update failed',
            description: latestScheduleFailure?.message ?? 'The last automatic update did not finish cleanly.',
          }
        : latestScheduleSuccess
          ? {
              tone: 'positive' as const,
              title: 'Automatic updates are working',
              description: latestScheduleSuccess.message,
            }
          : typeof lastTriggeredAtValue !== 'number'
            ? {
                tone: 'warning' as const,
                title: 'Automatic updates are on but not proven yet',
                description: 'The schedule is saved. Wait for the first successful update or run one manually now.',
              }
            : scheduleIsDue
              ? {
                  tone: 'warning' as const,
                  title: 'Automatic update window passed',
                  description: 'Check the recent activity below and confirm the next update succeeds.',
                }
              : {
                  tone: 'neutral' as const,
                  title: 'Waiting for the next automatic update',
                  description: 'The schedule is active and the next update window is still ahead.',
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
      <div className="grid gap-3 md:grid-cols-2">
        <div className="app-inset-stack">
          <div className="mb-3 flex items-center gap-2">
            <PlayCircle className="text-primary h-4 w-4" />
            <p className="text-text-strong text-sm font-semibold">Run now</p>
          </div>
          <p className="text-text-soft text-sm leading-6">
            Use this after changing your profile, documents, or search direction.
          </p>
        </div>
        <div className="app-inset-stack">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="text-text-strong h-4 w-4" />
            <p className="text-text-strong text-sm font-semibold">Keep it automatic</p>
          </div>
          <p className="text-text-soft text-sm leading-6">
            Turn the schedule on once the search target is stable and you want regular refreshes.
          </p>
        </div>
      </div>

      {sourceHealth ? (
        <div className="border-border/60 bg-surface/70 mt-4 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-text-strong text-sm font-semibold">Update quality</p>
              <p className="text-text-soft mt-1 text-sm">
                Recent usable update rate {usableRunRate == null ? 'n/a' : `${(usableRunRate * 100).toFixed(0)}%`}
              </p>
            </div>
            {sourceHealth.activePause ? <span className="app-badge">Paused for quality</span> : null}
          </div>
          <p className="text-text-soft mt-3 text-sm leading-6">{sourceHealth.guidance}</p>
        </div>
      ) : null}

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
        <div className="border-app-success-border bg-app-success-soft mt-4 rounded-2xl border p-4">
          <p className="text-text-strong font-semibold">Update request accepted</p>
          <p className="text-text-soft mt-1 text-sm">
            A new refresh is queued. You can keep working while the new results arrive.
          </p>
        </div>
      ) : null}

      <form className="app-muted-panel mt-5 space-y-4" onSubmit={jobSourcesPanel.submitSchedule}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Radar className="text-primary h-4 w-4" />
              <p className="text-text-strong text-sm font-semibold">Automatic updates</p>
            </div>
            <p className="text-text-soft text-xs">Keep this simple unless you need a custom schedule.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...registerSchedule('enabled')} />
            Enabled
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
          <div className="app-inset-stack">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Current schedule</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {jobSourcesPanel.scheduleResult?.enabled
                ? getSchedulePresetLabel(jobSourcesPanel.scheduleResult.cron)
                : 'Manual only'}
            </p>
          </div>
          <div className="app-inset-stack">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Last update</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {getUserFacingRunStatus(jobSourcesPanel.scheduleResult?.lastRunStatus)}
            </p>
            <p className="text-text-soft mt-1 text-xs">
              {formatDateTime(jobSourcesPanel.scheduleResult?.lastTriggeredAt)}
            </p>
          </div>
          <div className="app-inset-stack">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Next update</p>
            <p className="text-text-strong mt-2 text-sm font-semibold">
              {formatDateTime(jobSourcesPanel.scheduleResult?.nextRunAt)}
            </p>
          </div>
        </div>

        <div className={`rounded-2xl border p-3 ${getStoryTone(scheduleStory.tone)}`}>
          <p className="text-text-strong font-semibold">{scheduleStory.title}</p>
          <p className="text-text-soft mt-1">{scheduleStory.description}</p>
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-text-strong text-sm font-semibold">Recent automatic activity</p>
            <span className="app-badge">{jobSourcesPanel.scheduleEventsQuery.data?.total ?? 0} items</span>
          </div>
          {scheduleEvents.length ? (
            <div className="space-y-2">
              {scheduleEvents.slice(0, 5).map((event) => {
                const presentation = getScheduleEventPresentation(event);
                return (
                  <div key={event.id} className="border-border/60 bg-surface/70 rounded-2xl border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="app-badge">{presentation.label}</span>
                      <span className="app-badge">{event.severity}</span>
                    </div>
                    <p className="text-text-strong mt-2 text-sm font-medium">{presentation.summary}</p>
                    <p className="text-text-soft mt-1 text-xs">{formatDateTime(event.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <WorkflowInlineNotice
              title="No automatic activity yet"
              description="Activity will appear here once the schedule starts running."
              tone="info"
            />
          )}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        <p className="text-text-strong text-sm font-semibold">Recent updates</p>
        <p className="text-text-soft text-xs">
          Use this to confirm whether recent refreshes were useful and worth reviewing.
        </p>
        {recentRuns.length ? (
          recentRuns.map((run) => (
            <article key={run.id} className="app-muted-panel space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-badge">{getUserFacingRunStatus(run.status)}</span>
                <span className="app-badge">
                  {(run.usefulOfferCount ?? run.scrapedCount ?? 0).toString()} usable roles
                </span>
                <span className="app-badge">{(run.totalFound ?? 0).toString()} found</span>
              </div>
              <div className={`rounded-2xl border p-3 ${getStoryTone(run.story?.userVisibility)}`}>
                <p className="text-text-strong font-semibold">
                  {run.story?.summary ?? 'The latest update finished without a readable summary.'}
                </p>
                <p className="text-text-soft mt-1">
                  {run.story?.recommendedAction ?? 'Open opportunities or notebook to continue.'}
                </p>
              </div>
              {run.error ? (
                <WorkflowInlineNotice title="This update failed" description={run.error} tone="danger" />
              ) : null}
              <p className="text-text-soft text-xs">
                Finished {formatDateTime(run.finalizedAt ?? run.completedAt ?? run.createdAt)}
              </p>
            </article>
          ))
        ) : (
          <EmptyState
            title="No updates yet"
            description="Run a one-time update or save a schedule once your profile is ready."
          />
        )}
      </div>
    </Card>
  );
};

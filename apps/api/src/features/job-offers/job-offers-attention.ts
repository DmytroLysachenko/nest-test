import { extractFollowUpFields, hasMissingNextStep, resolveFollowUpState } from './job-offer-follow-up';

import type { JobOfferStatus } from '@repo/db';
import type { NotebookRankingMode } from './notebook-ranking';

export type AttentionSignal = {
  key:
    | 'follow_up_overdue'
    | 'follow_up_due_today'
    | 'follow_up_upcoming'
    | 'missing_next_step'
    | 'stale_pipeline'
    | 'prep_recommended'
    | 'awaiting_decision';
  label: string;
  reason: string;
};

const addAttentionSignal = (signals: AttentionSignal[], signal: AttentionSignal) => {
  if (!signals.some((item) => item.key === signal.key)) {
    signals.push(signal);
  }
};

const getPipelineMetaRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const parsePipelineDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const buildAttentionSignals = ({
  status,
  source,
  now,
}: {
  status: JobOfferStatus;
  source: {
    pipelineMeta?: unknown;
    prepMaterials?: unknown;
    followUpAt?: Date | string | null;
    nextStep?: string | null;
    followUpNote?: string | null;
    createdAt?: Date | string | null;
    lastStatusAt?: Date | string | null;
  };
  now?: Date;
}): AttentionSignal[] => {
  const referenceNow = now ?? new Date();
  const staleCutoff = new Date(referenceNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  const followUpFields = extractFollowUpFields({
    pipelineMeta: source.pipelineMeta,
    followUpAt: parsePipelineDate(source.followUpAt),
    nextStep: source.nextStep ?? null,
    followUpNote: source.followUpNote ?? null,
  });
  const signals: AttentionSignal[] = [];
  const pipelineMeta = getPipelineMetaRecord(source.pipelineMeta);
  const decisionDueAt = parsePipelineDate(pipelineMeta.decisionDueAt);
  const prepRecommended =
    typeof pipelineMeta.prepRecommended === 'boolean'
      ? pipelineMeta.prepRecommended
      : ['APPLIED', 'INTERVIEWING', 'OFFER'].includes(status);
  const followUpState = resolveFollowUpState(status, source, referenceNow);
  const followUpAt = followUpFields.followUpAt;
  const lastStatusAt = source.lastStatusAt
    ? new Date(source.lastStatusAt)
    : source.createdAt
      ? new Date(source.createdAt)
      : null;
  const isStaleActive =
    ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'].includes(status) &&
    !!lastStatusAt &&
    !Number.isNaN(lastStatusAt.getTime()) &&
    lastStatusAt < staleCutoff;
  const hasPrepMaterials =
    source.prepMaterials && typeof source.prepMaterials === 'object' && !Array.isArray(source.prepMaterials);

  if (followUpAt && followUpState === 'due') {
    addAttentionSignal(signals, {
      key: 'follow_up_overdue',
      label: 'Follow-up overdue',
      reason: 'A scheduled follow-up date is already in the past and needs immediate action.',
    });
  }

  if (followUpAt && isSameDay(followUpAt, referenceNow) && followUpState !== 'due') {
    addAttentionSignal(signals, {
      key: 'follow_up_due_today',
      label: 'Follow-up due today',
      reason: 'A follow-up checkpoint is scheduled for today and should be prepared before the day ends.',
    });
  }

  if (followUpState === 'upcoming') {
    addAttentionSignal(signals, {
      key: 'follow_up_upcoming',
      label: 'Follow-up upcoming',
      reason: 'A future follow-up is already scheduled and can be prepared in advance.',
    });
  }

  if (hasMissingNextStep(status, source)) {
    addAttentionSignal(signals, {
      key: 'missing_next_step',
      label: 'Missing next step',
      reason: 'This role is active in the workflow but still has no explicit next move attached.',
    });
  }

  if (isStaleActive) {
    addAttentionSignal(signals, {
      key: 'stale_pipeline',
      label: 'Stale pipeline',
      reason: 'The active pipeline entry has not moved recently and needs a fresh decision or follow-up.',
    });
  }

  if (prepRecommended && !hasPrepMaterials && ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'].includes(status)) {
    addAttentionSignal(signals, {
      key: 'prep_recommended',
      label: 'Prep recommended',
      reason: 'This role is active enough that a reply or interview briefing would save time.',
    });
  }

  if (status === 'SAVED' && !followUpFields.nextStep && !decisionDueAt) {
    addAttentionSignal(signals, {
      key: 'awaiting_decision',
      label: 'Awaiting decision',
      reason: 'The role was kept, but it still needs an explicit keep-or-discard decision checkpoint.',
    });
  }

  if (decisionDueAt && decisionDueAt <= referenceNow) {
    addAttentionSignal(signals, {
      key: 'awaiting_decision',
      label: 'Decision due',
      reason: 'The saved decision deadline is due now and should be reviewed before new discovery work.',
    });
  }

  return signals;
};

export const buildCollectionState = ({
  mode,
  hiddenByModeCount,
  degradedResultCount,
  lastScrapeStatus,
}: {
  mode: NotebookRankingMode;
  hiddenByModeCount: number;
  degradedResultCount: number;
  lastScrapeStatus: string | null;
}) => {
  if (mode === 'strict' && hiddenByModeCount > 0) {
    return {
      key: 'hidden' as const,
      title: 'Strong leads exist, but strict mode is hiding them',
      description: `${hiddenByModeCount} offer${hiddenByModeCount === 1 ? '' : 's'} matched the notebook but violated one or more hard constraints.`,
      actionLabel: 'Switch to approx',
      href: '/notebook?mode=approx',
    };
  }

  if (degradedResultCount > 0) {
    return {
      key: 'degraded' as const,
      title: 'Only lower-confidence rows are visible in this slice',
      description: `${degradedResultCount} offer${degradedResultCount === 1 ? '' : 's'} were accepted from degraded or low-context source data.`,
      actionLabel: mode === 'explore' ? 'Open planning' : 'Switch to explore',
      href: mode === 'explore' ? '/planning' : '/notebook?mode=explore',
    };
  }

  if (lastScrapeStatus === 'FAILED') {
    return {
      key: 'failed' as const,
      title: 'The latest sourcing run failed before it produced notebook-ready offers',
      description: 'This empty queue is more likely a run failure than a truly empty market.',
      actionLabel: 'Open planning',
      href: '/planning',
    };
  }

  return {
    key: 'empty' as const,
    title: 'No offers are in this slice right now',
    description: 'This queue currently has nothing actionable with the current filters and notebook mode.',
    actionLabel: mode === 'approx' ? 'Switch to explore' : 'Open planning',
    href: mode === 'approx' ? '/notebook?mode=explore' : '/planning',
  };
};

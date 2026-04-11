import { buildAttentionSignals } from './job-offers-attention';
import { extractFollowUpFields, resolveFollowUpState } from './job-offer-follow-up';

import type { JobOfferStatus } from '@repo/db';
import type { AttentionSignal } from './job-offers-attention';

export type JobOfferRecommendedAction = {
  key:
    | 'complete-overdue-follow-up'
    | 'handle-today-follow-up'
    | 'set-next-step'
    | 'review-stale-pipeline'
    | 'prepare-application'
    | 'set-decision-checkpoint'
    | 'review-upcoming-follow-up'
    | 'triage-offer';
  label: string;
  reason: string;
  href: string;
};

type RecommendedActionSource = {
  id?: string;
  status: JobOfferStatus;
  pipelineMeta?: unknown;
  prepMaterials?: unknown;
  followUpAt?: Date | string | null;
  nextStep?: string | null;
  followUpNote?: string | null;
  createdAt?: Date | string | null;
  lastStatusAt?: Date | string | null;
};

const findSignal = (signals: AttentionSignal[], key: AttentionSignal['key']) =>
  signals.find((signal) => signal.key === key);

export const buildRecommendedAction = (
  source: RecommendedActionSource,
  now = new Date(),
): JobOfferRecommendedAction => {
  const signals = buildAttentionSignals({ status: source.status, source, now });
  const followUpFields = extractFollowUpFields(source as unknown as Parameters<typeof extractFollowUpFields>[0]);
  const href = source.id ? `/notebook?selected=${source.id}` : '/notebook';
  const followUpState = resolveFollowUpState(source.status, source, now);
  const overdue = findSignal(signals, 'follow_up_overdue');
  if (overdue) {
    return {
      key: 'complete-overdue-follow-up',
      label: 'Complete overdue follow-up',
      reason: followUpFields.nextStep ? `Next step: ${followUpFields.nextStep}.` : overdue.reason,
      href,
    };
  }

  const dueToday = findSignal(signals, 'follow_up_due_today');
  if (dueToday) {
    return {
      key: 'handle-today-follow-up',
      label: 'Handle today',
      reason: followUpFields.nextStep ? `Today: ${followUpFields.nextStep}.` : dueToday.reason,
      href,
    };
  }

  const missingNextStep = findSignal(signals, 'missing_next_step');
  if (missingNextStep) {
    return {
      key: 'set-next-step',
      label: 'Set next step',
      reason: missingNextStep.reason,
      href,
    };
  }

  const stalePipeline = findSignal(signals, 'stale_pipeline');
  if (stalePipeline) {
    return {
      key: 'review-stale-pipeline',
      label: 'Review stale pipeline',
      reason: stalePipeline.reason,
      href,
    };
  }

  const prepRecommended = findSignal(signals, 'prep_recommended');
  if (prepRecommended) {
    return {
      key: 'prepare-application',
      label: 'Prepare application',
      reason: prepRecommended.reason,
      href,
    };
  }

  const awaitingDecision = findSignal(signals, 'awaiting_decision');
  if (awaitingDecision) {
    return {
      key: 'set-decision-checkpoint',
      label: 'Set decision checkpoint',
      reason: awaitingDecision.reason,
      href,
    };
  }

  if (followUpState === 'upcoming') {
    const upcoming = findSignal(signals, 'follow_up_upcoming');
    return {
      key: 'review-upcoming-follow-up',
      label: 'Prepare upcoming follow-up',
      reason: followUpFields.nextStep
        ? `Upcoming: ${followUpFields.nextStep}.`
        : (upcoming?.reason ?? 'A future follow-up is scheduled.'),
      href,
    };
  }

  return {
    key: 'triage-offer',
    label: source.status === 'NEW' || source.status === 'SEEN' ? 'Triage offer' : 'Review offer',
    reason:
      source.status === 'NEW' || source.status === 'SEEN'
        ? 'Decide whether this offer belongs in the active notebook.'
        : 'No urgent workflow pressure is attached yet.',
    href,
  };
};

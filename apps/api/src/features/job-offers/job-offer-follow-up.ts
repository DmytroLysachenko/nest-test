import type { JobOfferStatus } from '@repo/db';

const FOLLOW_UP_ELIGIBLE_STATUSES: JobOfferStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING'];

export type FollowUpState = 'due' | 'upcoming' | 'none';

export const parseFollowUpAt = (pipelineMeta: unknown) => {
  const value =
    pipelineMeta && typeof pipelineMeta === 'object' && !Array.isArray(pipelineMeta)
      ? (pipelineMeta as Record<string, unknown>).followUpAt
      : null;

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const isFollowUpEligibleStatus = (status: JobOfferStatus) => FOLLOW_UP_ELIGIBLE_STATUSES.includes(status);

export const resolveFollowUpState = (
  status: JobOfferStatus,
  pipelineMeta: unknown,
  now = new Date(),
): FollowUpState => {
  if (!isFollowUpEligibleStatus(status)) {
    return 'none';
  }

  const followUpAt = parseFollowUpAt(pipelineMeta);
  if (!followUpAt) {
    return 'none';
  }

  return followUpAt.getTime() <= now.getTime() ? 'due' : 'upcoming';
};

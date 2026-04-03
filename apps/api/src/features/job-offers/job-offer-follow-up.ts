import type { JobOfferStatus } from '@repo/db';

const FOLLOW_UP_ELIGIBLE_STATUSES: JobOfferStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];

export type FollowUpState = 'due' | 'upcoming' | 'none';

export type FollowUpFields = {
  followUpAt: Date | null;
  nextStep: string | null;
  followUpNote: string | null;
  applicationUrl: string | null;
  contactName: string | null;
  lastFollowUpCompletedAt: Date | null;
  lastFollowUpSnoozedAt: Date | null;
};

type FollowUpSource = Partial<FollowUpFields> & {
  pipelineMeta?: unknown;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getPipelineMetaRecord = (pipelineMeta: unknown) =>
  pipelineMeta && typeof pipelineMeta === 'object' && !Array.isArray(pipelineMeta)
    ? { ...(pipelineMeta as Record<string, unknown>) }
    : {};

export const parseFollowUpAt = (source: FollowUpSource | unknown) => {
  if (source && typeof source === 'object' && 'followUpAt' in source) {
    const direct = parseDate((source as FollowUpSource).followUpAt);
    if (direct) {
      return direct;
    }
  }

  const pipelineMeta =
    source && typeof source === 'object' && 'pipelineMeta' in source
      ? getPipelineMetaRecord((source as FollowUpSource).pipelineMeta)
      : getPipelineMetaRecord(source);
  return parseDate(pipelineMeta?.followUpAt);
};

export const isFollowUpEligibleStatus = (status: JobOfferStatus) => FOLLOW_UP_ELIGIBLE_STATUSES.includes(status);

export const extractFollowUpFields = (source: FollowUpSource): FollowUpFields => {
  const pipelineMeta = getPipelineMetaRecord(source.pipelineMeta);

  return {
    followUpAt: parseDate(source.followUpAt) ?? parseDate(pipelineMeta?.followUpAt),
    nextStep: normalizeText(source.nextStep) ?? normalizeText(pipelineMeta?.nextStep),
    followUpNote: normalizeText(source.followUpNote) ?? normalizeText(pipelineMeta?.followUpNote),
    applicationUrl: normalizeText(source.applicationUrl) ?? normalizeText(pipelineMeta?.applicationUrl),
    contactName: normalizeText(source.contactName) ?? normalizeText(pipelineMeta?.contactName),
    lastFollowUpCompletedAt:
      parseDate(source.lastFollowUpCompletedAt) ?? parseDate(pipelineMeta?.lastFollowUpCompletedAt),
    lastFollowUpSnoozedAt: parseDate(source.lastFollowUpSnoozedAt) ?? parseDate(pipelineMeta?.lastFollowUpSnoozedAt),
  };
};

export const buildPipelineMetaWithFollowUp = (
  pipelineMeta: unknown,
  fields: FollowUpFields,
): Record<string, unknown> | null => {
  const base = getPipelineMetaRecord(pipelineMeta);
  const nextPipelineMeta: Record<string, unknown> = base ? { ...base } : {};

  const assignTextField = (
    key: keyof Pick<FollowUpFields, 'nextStep' | 'followUpNote' | 'applicationUrl' | 'contactName'>,
  ) => {
    const value = fields[key];
    if (value) {
      nextPipelineMeta[key] = value;
      return;
    }
    delete nextPipelineMeta[key];
  };

  if (fields.followUpAt) {
    nextPipelineMeta.followUpAt = fields.followUpAt.toISOString();
  } else {
    delete nextPipelineMeta.followUpAt;
  }

  assignTextField('nextStep');
  assignTextField('followUpNote');
  assignTextField('applicationUrl');
  assignTextField('contactName');

  if (fields.lastFollowUpCompletedAt) {
    nextPipelineMeta.lastFollowUpCompletedAt = fields.lastFollowUpCompletedAt.toISOString();
  } else {
    delete nextPipelineMeta.lastFollowUpCompletedAt;
  }

  if (fields.lastFollowUpSnoozedAt) {
    nextPipelineMeta.lastFollowUpSnoozedAt = fields.lastFollowUpSnoozedAt.toISOString();
  } else {
    delete nextPipelineMeta.lastFollowUpSnoozedAt;
  }

  return Object.keys(nextPipelineMeta).length ? nextPipelineMeta : null;
};

export const resolveFollowUpState = (
  status: JobOfferStatus,
  source: FollowUpSource | unknown,
  now = new Date(),
): FollowUpState => {
  if (!isFollowUpEligibleStatus(status)) {
    return 'none';
  }

  const followUpAt = parseFollowUpAt(source);
  if (!followUpAt) {
    return 'none';
  }

  return followUpAt.getTime() <= now.getTime() ? 'due' : 'upcoming';
};

export const hasMissingNextStep = (status: JobOfferStatus, source: FollowUpSource | unknown) => {
  if (!isFollowUpEligibleStatus(status)) {
    return false;
  }

  const fields = extractFollowUpFields(
    source && typeof source === 'object' ? (source as FollowUpSource) : { pipelineMeta: source },
  );
  return !fields.nextStep;
};

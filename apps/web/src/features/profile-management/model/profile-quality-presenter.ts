import type { CareerProfileQualityDto } from '@/shared/types/api';

type QualitySignalStatus = CareerProfileQualityDto['signals'][number]['status'];

type QualitySignalPresentation = {
  key: string;
  label: string;
  status: QualitySignalStatus;
  statusLabel: string;
  message: string;
};

const PROFILE_QUALITY_SIGNAL_LABELS: Record<string, string> = {
  target_roles: 'Target roles',
  technologies_coverage: 'Technology coverage',
  core_competencies: 'Core competencies',
  keywords_coverage: 'Keyword coverage',
  experience_depth: 'Experience depth',
  education_signal: 'Education signal',
  seniority_signal: 'Seniority signal',
  location_constraints: 'Location constraints',
  work_mode_constraints: 'Work mode constraints',
};

const PROFILE_QUALITY_STATUS_LABELS: Record<QualitySignalStatus, string> = {
  ok: 'Strong',
  weak: 'Could be stronger',
  missing: 'Missing',
};

const toTitleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const getProfileQualitySignalLabel = (key: string) => PROFILE_QUALITY_SIGNAL_LABELS[key] ?? toTitleCase(key);

export const getProfileQualityStatusLabel = (status: QualitySignalStatus) => PROFILE_QUALITY_STATUS_LABELS[status];

export const presentProfileQualitySignals = (
  signals: CareerProfileQualityDto['signals'],
): QualitySignalPresentation[] =>
  signals.map((signal) => ({
    key: signal.key,
    label: getProfileQualitySignalLabel(signal.key),
    status: signal.status,
    statusLabel: getProfileQualityStatusLabel(signal.status),
    message: signal.message,
  }));

export const presentProfileQualityMissing = (missing: string[]) => missing.map(getProfileQualitySignalLabel);

import { getUserFacingRunStatus } from '@/shared/lib/presentation/job-search-ui';
import { formatDateTime } from '@/shared/lib/utils/date-format';

export const formatWorkspaceDateTime = (value: string | null) => {
  return formatDateTime(value);
};

export const getWorkspaceRunStatusTone = (
  status: string | null,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (!status) {
    return 'neutral';
  }
  if (status === 'COMPLETED') {
    return 'success';
  }
  if (status === 'FAILED') {
    return 'danger';
  }
  if (status === 'RUNNING' || status === 'PENDING') {
    return 'info';
  }
  return 'warning';
};

export const getWorkspaceRunStatusTrendTone = (status: string | null): 'success' | 'warning' | 'danger' | 'info' => {
  const tone = getWorkspaceRunStatusTone(status);
  return tone === 'neutral' ? 'warning' : tone;
};

export const getWorkspaceReliabilityLabel = (successRate: number | undefined) => {
  if (successRate == null) {
    return {
      label: 'Unknown',
      tone: 'neutral' as const,
    };
  }
  if (successRate >= 0.9) {
    return {
      label: 'Stable',
      tone: 'success' as const,
    };
  }
  if (successRate >= 0.75) {
    return {
      label: 'Watch closely',
      tone: 'warning' as const,
    };
  }
  return {
    label: 'Needs attention',
    tone: 'danger' as const,
  };
};

export const getWorkspaceRunStatusLabel = (status: string | null | undefined) => getUserFacingRunStatus(status);

export const formatWorkspaceDateTime = (value: string | null) => {
  if (!value) {
    return 'n/a';
  }

  return new Date(value).toLocaleString();
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
      label: 'Unknown reliability',
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

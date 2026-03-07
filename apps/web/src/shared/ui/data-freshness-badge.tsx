type DataFreshnessBadgeProps = {
  updatedAt: number | null | undefined;
  staleAfterMs?: number;
  label?: string;
};

const formatAge = (ageMs: number) => {
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 60) {
    return `${ageSec}s ago`;
  }

  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) {
    return `${ageMin}m ago`;
  }

  const ageHours = Math.floor(ageMin / 60);
  return `${ageHours}h ago`;
};

export const DataFreshnessBadge = ({
  updatedAt,
  staleAfterMs = 1000 * 60 * 10,
  label = 'Updated',
}: DataFreshnessBadgeProps) => {
  if (!updatedAt) {
    return <span className="app-badge">No refresh yet</span>;
  }

  const age = Date.now() - updatedAt;
  const stale = age > staleAfterMs;

  return (
    <span className={`app-badge border ${stale ? 'app-status-warning' : 'app-status-success'}`}>
      {label}: {formatAge(age)}
    </span>
  );
};

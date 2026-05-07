export type ResetVerificationPhase = 'pre-reset' | 'post-reset';
export type ResetReadinessStatus = 'pass' | 'warn' | 'fail';

export type ResetReadinessMetrics = {
  migrationsTablePresent: boolean;
  migrationCount: number;
  missingRequiredTables: string[];
  activeAdminUsers: number;
  enabledSchedules: number;
  schedulesNeverTriggered: number;
  staleEnqueuedSchedules: number;
  orphanUserJobOffers: number;
  duplicateUserJobOffers: number;
  totalUserJobOffers: number;
  totalJobOffers: number;
  activePastExpiryOffers: number;
  activeStaleNullExpiryOffers: number;
  pracujOffers: number;
  pracujOffersWithoutCategory: number;
  pracujOffersWithoutEmploymentType: number;
  pracujOffersWithoutWorkMode: number;
  recentScheduledCompletedRuns: number;
  recentScheduledFailedRuns: number;
  recentManualOrDirectCompletedRuns: number;
  recentManualOrDirectFailedRuns: number;
  recentRecoveredFailedRuns: number;
  recentDetailParseGapRuns: number;
  recentCallbackRejectedRuns: number;
  recentTerminalScheduleEvents: number;
};

export type ResetReadinessGate = {
  key: string;
  label: string;
  status: ResetReadinessStatus;
  summary: string;
  details: Record<string, number | string | boolean | null>;
};

export type ResetReadinessReport = {
  phase: ResetVerificationPhase;
  overallStatus: ResetReadinessStatus;
  generatedAt: string;
  windowHours: number;
  nullExpiryStaleHours: number;
  metrics: ResetReadinessMetrics;
  gates: ResetReadinessGate[];
};

export type ResetReadinessOptions = {
  phase?: ResetVerificationPhase;
  windowHours?: number;
  nullExpiryStaleHours?: number;
  minimumCategoryCoverageRate?: number;
};

const statusRank: Record<ResetReadinessStatus, number> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

const maxStatus = (statuses: ResetReadinessStatus[]): ResetReadinessStatus =>
  statuses.reduce<ResetReadinessStatus>(
    (current, next) => (statusRank[next] > statusRank[current] ? next : current),
    'pass',
  );

const toRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const buildResetReadinessReport = (
  metrics: ResetReadinessMetrics,
  options: ResetReadinessOptions = {},
): ResetReadinessReport => {
  const phase = options.phase ?? 'pre-reset';
  const windowHours = Math.max(1, options.windowHours ?? 72);
  const nullExpiryStaleHours = Math.max(1, options.nullExpiryStaleHours ?? 336);
  const minimumCategoryCoverageRate = options.minimumCategoryCoverageRate ?? 0.8;
  const categoryCoverageRate = toRate(
    Math.max(0, metrics.pracujOffers - metrics.pracujOffersWithoutCategory),
    metrics.pracujOffers,
  );

  const gates: ResetReadinessGate[] = [
    {
      key: 'schema',
      label: 'Schema state',
      status:
        metrics.migrationsTablePresent && metrics.missingRequiredTables.length === 0 && metrics.migrationCount > 0
          ? 'pass'
          : 'fail',
      summary:
        metrics.migrationsTablePresent && metrics.missingRequiredTables.length === 0 && metrics.migrationCount > 0
          ? 'Migrations ledger and required runtime tables are present.'
          : 'Schema state is incomplete or drifted; reset verification cannot be trusted yet.',
      details: {
        migrationsTablePresent: metrics.migrationsTablePresent,
        migrationCount: metrics.migrationCount,
        missingRequiredTables: metrics.missingRequiredTables.join(', ') || null,
      },
    },
    {
      key: 'seed-admin',
      label: 'Seed/admin state',
      status: metrics.activeAdminUsers > 0 ? 'pass' : phase === 'post-reset' ? 'fail' : 'warn',
      summary:
        metrics.activeAdminUsers > 0
          ? 'At least one active admin user exists for support and reset verification.'
          : phase === 'post-reset'
            ? 'No active admin user exists after reset.'
            : 'No active admin user detected yet; acceptable before reset but not after execution.',
      details: {
        activeAdminUsers: metrics.activeAdminUsers,
      },
    },
    {
      key: 'schedule-state',
      label: 'Schedule terminal state',
      status:
        metrics.enabledSchedules === 0
          ? phase === 'post-reset'
            ? 'fail'
            : 'warn'
          : metrics.staleEnqueuedSchedules > 0
            ? 'fail'
            : metrics.schedulesNeverTriggered > 0
              ? phase === 'post-reset'
                ? 'warn'
                : 'warn'
              : 'pass',
      summary:
        metrics.enabledSchedules === 0
          ? phase === 'post-reset'
            ? 'No enabled schedules exist after reset.'
            : 'No enabled schedules exist yet.'
          : metrics.staleEnqueuedSchedules > 0
            ? 'Some schedules still look stuck in enqueue-time status.'
            : metrics.schedulesNeverTriggered > 0
              ? 'Some enabled schedules have never triggered yet.'
              : 'Enabled schedules have terminalized cleanly.',
      details: {
        enabledSchedules: metrics.enabledSchedules,
        schedulesNeverTriggered: metrics.schedulesNeverTriggered,
        staleEnqueuedSchedules: metrics.staleEnqueuedSchedules,
        recentTerminalScheduleEvents: metrics.recentTerminalScheduleEvents,
      },
    },
    {
      key: 'offer-integrity',
      label: 'Offer integrity',
      status:
        metrics.activePastExpiryOffers > 0 || metrics.activeStaleNullExpiryOffers > 0
          ? 'fail'
          : categoryCoverageRate < minimumCategoryCoverageRate
            ? phase === 'post-reset'
              ? 'warn'
              : 'warn'
            : 'pass',
      summary:
        metrics.activePastExpiryOffers > 0 || metrics.activeStaleNullExpiryOffers > 0
          ? 'Active inventory still contains offers that should already be expired.'
          : categoryCoverageRate < minimumCategoryCoverageRate
            ? `Pracuj category coverage is below target (${formatPercent(categoryCoverageRate)} < ${formatPercent(minimumCategoryCoverageRate)}).`
            : 'Expiry and category integrity look healthy for current offer inventory.',
      details: {
        totalJobOffers: metrics.totalJobOffers,
        activePastExpiryOffers: metrics.activePastExpiryOffers,
        activeStaleNullExpiryOffers: metrics.activeStaleNullExpiryOffers,
        pracujOffers: metrics.pracujOffers,
        pracujOffersWithoutCategory: metrics.pracujOffersWithoutCategory,
        pracujCategoryCoverageRate: categoryCoverageRate,
        pracujOffersWithoutEmploymentType: metrics.pracujOffersWithoutEmploymentType,
        pracujOffersWithoutWorkMode: metrics.pracujOffersWithoutWorkMode,
      },
    },
    {
      key: 'user-link-integrity',
      label: 'User link integrity',
      status: metrics.orphanUserJobOffers > 0 || metrics.duplicateUserJobOffers > 0 ? 'fail' : 'pass',
      summary:
        metrics.orphanUserJobOffers > 0 || metrics.duplicateUserJobOffers > 0
          ? 'User-job-offer linkage contains orphaned or duplicate rows.'
          : 'User-job-offer linkage is coherent.',
      details: {
        totalUserJobOffers: metrics.totalUserJobOffers,
        orphanUserJobOffers: metrics.orphanUserJobOffers,
        duplicateUserJobOffers: metrics.duplicateUserJobOffers,
      },
    },
    {
      key: 'workflow',
      label: 'Workflow verification',
      status:
        phase === 'post-reset'
          ? metrics.recentManualOrDirectCompletedRuns === 0 || metrics.recentScheduledCompletedRuns === 0
            ? 'fail'
            : metrics.recentScheduledFailedRuns > 0 || metrics.recentManualOrDirectFailedRuns > 0
              ? 'warn'
              : 'pass'
          : metrics.recentScheduledCompletedRuns === 0 && metrics.recentManualOrDirectCompletedRuns === 0
            ? 'warn'
            : metrics.recentScheduledFailedRuns > 0 || metrics.recentManualOrDirectFailedRuns > 0
              ? 'warn'
              : 'pass',
      summary:
        phase === 'post-reset'
          ? metrics.recentManualOrDirectCompletedRuns === 0 || metrics.recentScheduledCompletedRuns === 0
            ? 'Post-reset verification is still missing either a scheduled or a manual/direct successful scrape.'
            : metrics.recentScheduledFailedRuns > 0 || metrics.recentManualOrDirectFailedRuns > 0
              ? 'Successful scrapes exist, but recent failures still require operator review.'
              : 'Recent scheduled and manual/direct scrape flows both completed successfully.'
          : metrics.recentScheduledCompletedRuns === 0 && metrics.recentManualOrDirectCompletedRuns === 0
            ? 'No recent successful scrape flows found in the current window yet.'
            : 'At least one recent successful scrape flow exists for current verification window.',
      details: {
        recentScheduledCompletedRuns: metrics.recentScheduledCompletedRuns,
        recentScheduledFailedRuns: metrics.recentScheduledFailedRuns,
        recentManualOrDirectCompletedRuns: metrics.recentManualOrDirectCompletedRuns,
        recentManualOrDirectFailedRuns: metrics.recentManualOrDirectFailedRuns,
        recentRecoveredFailedRuns: metrics.recentRecoveredFailedRuns,
        recentDetailParseGapRuns: metrics.recentDetailParseGapRuns,
        recentCallbackRejectedRuns: metrics.recentCallbackRejectedRuns,
      },
    },
  ];

  return {
    phase,
    overallStatus: maxStatus(gates.map((gate) => gate.status)),
    generatedAt: new Date().toISOString(),
    windowHours,
    nullExpiryStaleHours,
    metrics,
    gates,
  };
};

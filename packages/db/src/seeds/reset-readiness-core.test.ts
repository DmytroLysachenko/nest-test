import assert from 'node:assert/strict';
import test from 'node:test';

import { buildResetReadinessReport, type ResetReadinessMetrics } from './reset-readiness-core';

const baseMetrics = (): ResetReadinessMetrics => ({
  migrationsTablePresent: true,
  migrationCount: 12,
  missingRequiredTables: [],
  activeAdminUsers: 1,
  enabledSchedules: 2,
  schedulesNeverTriggered: 0,
  staleEnqueuedSchedules: 0,
  orphanUserJobOffers: 0,
  duplicateUserJobOffers: 0,
  totalUserJobOffers: 5,
  totalJobOffers: 20,
  activePastExpiryOffers: 0,
  activeStaleNullExpiryOffers: 0,
  pracujOffers: 10,
  pracujOffersWithoutCategory: 1,
  pracujOffersWithoutEmploymentType: 0,
  pracujOffersWithoutWorkMode: 0,
  recentScheduledCompletedRuns: 1,
  recentScheduledFailedRuns: 0,
  recentManualOrDirectCompletedRuns: 1,
  recentManualOrDirectFailedRuns: 0,
  recentRecoveredFailedRuns: 0,
  recentDetailParseGapRuns: 0,
  recentCallbackRejectedRuns: 0,
  recentTerminalScheduleEvents: 2,
});

test('buildResetReadinessReport passes healthy post-reset metrics', () => {
  const report = buildResetReadinessReport(baseMetrics(), {
    phase: 'post-reset',
    minimumCategoryCoverageRate: 0.8,
  });

  assert.equal(report.overallStatus, 'pass');
  assert.deepEqual(
    report.gates.map((gate) => gate.status),
    ['pass', 'pass', 'pass', 'pass', 'pass', 'pass'],
  );
});

test('buildResetReadinessReport fails when schema tables are missing', () => {
  const report = buildResetReadinessReport({
    ...baseMetrics(),
    migrationsTablePresent: false,
    missingRequiredTables: ['job_offers'],
  });

  assert.equal(report.overallStatus, 'fail');
  assert.equal(report.gates.find((gate) => gate.key === 'schema')?.status, 'fail');
});

test('buildResetReadinessReport fails when active expired offers remain visible', () => {
  const report = buildResetReadinessReport({
    ...baseMetrics(),
    activePastExpiryOffers: 3,
  });

  assert.equal(report.gates.find((gate) => gate.key === 'offer-integrity')?.status, 'fail');
});

test('buildResetReadinessReport warns on weak category coverage before reset', () => {
  const report = buildResetReadinessReport(
    {
      ...baseMetrics(),
      pracujOffersWithoutCategory: 4,
    },
    { phase: 'pre-reset', minimumCategoryCoverageRate: 0.8 },
  );

  assert.equal(report.gates.find((gate) => gate.key === 'offer-integrity')?.status, 'warn');
  assert.equal(report.overallStatus, 'warn');
});

test('buildResetReadinessReport fails post-reset when manual or scheduled verification is missing', () => {
  const report = buildResetReadinessReport(
    {
      ...baseMetrics(),
      recentManualOrDirectCompletedRuns: 0,
    },
    { phase: 'post-reset' },
  );

  assert.equal(report.gates.find((gate) => gate.key === 'workflow')?.status, 'fail');
});

test('buildResetReadinessReport warns on enabled schedules that never triggered', () => {
  const report = buildResetReadinessReport({
    ...baseMetrics(),
    schedulesNeverTriggered: 1,
  });

  assert.equal(report.gates.find((gate) => gate.key === 'schedule-state')?.status, 'warn');
});

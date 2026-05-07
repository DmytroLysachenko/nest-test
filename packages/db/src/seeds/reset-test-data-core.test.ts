import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildResetCleanupPlan,
  buildResetCleanupPreviewSummary,
  normalizeResetCleanupOptions,
  validateResetCleanupOptions,
} from './reset-test-data-core';

test('normalizeResetCleanupOptions parses targets and booleans', () => {
  const options = normalizeResetCleanupOptions({
    RESET_USER_IDS: 'user-1, user-2, user-1',
    RESET_USER_EMAILS: 'A@EXAMPLE.COM, b@example.com ',
    RESET_SCOPE: 'user-and-shared-offers',
    RESET_INCLUDE_PROFILE_WORKFLOW: 'true',
    APPLY_CHANGES: 'yes',
    RESET_CONFIRM: 'RESET_TEST_DATA',
  });

  assert.deepEqual(options.userIds, ['user-1', 'user-2']);
  assert.deepEqual(options.userEmails, ['a@example.com', 'b@example.com']);
  assert.equal(options.scope, 'user-and-shared-offers');
  assert.equal(options.includeProfileWorkflowData, true);
  assert.equal(options.applyChanges, true);
  assert.equal(options.confirmationToken, 'RESET_TEST_DATA');
});

test('validateResetCleanupOptions rejects missing targets', () => {
  assert.throws(
    () =>
      validateResetCleanupOptions({
        userIds: [],
        userEmails: [],
        scope: 'user-only',
        includeProfileWorkflowData: false,
        applyChanges: false,
        confirmationToken: null,
      }),
    /RESET_USER_IDS/,
  );
});

test('validateResetCleanupOptions rejects destructive apply without confirmation token', () => {
  assert.throws(
    () =>
      validateResetCleanupOptions({
        userIds: ['user-1'],
        userEmails: [],
        scope: 'user-only',
        includeProfileWorkflowData: false,
        applyChanges: true,
        confirmationToken: null,
      }),
    /RESET_CONFIRM=RESET_TEST_DATA/,
  );
});

test('buildResetCleanupPlan adds profile and shared-offer phases only when requested', () => {
  const userOnlyPlan = buildResetCleanupPlan({
    scope: 'user-only',
    includeProfileWorkflowData: false,
  });
  const sharedPlan = buildResetCleanupPlan({
    scope: 'user-and-shared-offers',
    includeProfileWorkflowData: true,
  });

  assert.deepEqual(
    userOnlyPlan.phases.map((phase) => phase.key),
    ['workflow-links', 'run-ledger', 'verification'],
  );
  assert.deepEqual(
    sharedPlan.phases.map((phase) => phase.key),
    ['workflow-links', 'run-ledger', 'profile-workflow', 'shared-offers', 'verification'],
  );
});

test('buildResetCleanupPreviewSummary hides profile section when profile workflow reset is off', () => {
  const summary = buildResetCleanupPreviewSummary(
    {
      targetUsers: 2,
      targetRuns: 4,
      targetLinkedOffers: 10,
      targetRunOwnedOffers: 7,
      deletableSharedOffers: 6,
      preservedSharedOffers: 4,
      userJobOffers: 12,
      jobMatches: 5,
      schedules: 2,
      scheduleEvents: 8,
      runEvents: 16,
      runAttempts: 4,
      callbackEvents: 3,
      scrapeExecutionEvents: 4,
      workerTaskExecutions: 4,
      careerProfiles: 2,
      profileInputs: 2,
      notebookPreferences: 2,
      onboardingDrafts: 1,
      documents: 3,
    },
    {
      scope: 'user-only',
      includeProfileWorkflowData: false,
    },
  );

  assert.equal(summary.profileWorkflowRows, null);
  assert.equal(summary.offerImpact.deletableSharedOffers, 0);
});

export type ResetCleanupScope = 'user-only' | 'user-and-shared-offers';

export type ResetCleanupOptions = {
  userIds: string[];
  userEmails: string[];
  scope: ResetCleanupScope;
  includeProfileWorkflowData: boolean;
  applyChanges: boolean;
  confirmationToken: string | null;
};

export type ResetCleanupPlan = {
  scope: ResetCleanupScope;
  includeProfileWorkflowData: boolean;
  phases: Array<{
    key: string;
    label: string;
    steps: string[];
  }>;
};

export type ResetCleanupPreview = {
  targetUsers: number;
  targetRuns: number;
  targetLinkedOffers: number;
  targetRunOwnedOffers: number;
  deletableSharedOffers: number;
  preservedSharedOffers: number;
  userJobOffers: number;
  jobMatches: number;
  schedules: number;
  scheduleEvents: number;
  runEvents: number;
  runAttempts: number;
  callbackEvents: number;
  scrapeExecutionEvents: number;
  workerTaskExecutions: number;
  careerProfiles: number;
  profileInputs: number;
  notebookPreferences: number;
  onboardingDrafts: number;
  documents: number;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const parseCsv = (value: string | undefined | null) =>
  Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const parseBoolean = (value: string | undefined | null) => TRUE_VALUES.has((value ?? '').trim().toLowerCase());

export const normalizeResetCleanupOptions = (env: Record<string, string | undefined>): ResetCleanupOptions => {
  const scopeRaw = (env.RESET_SCOPE ?? 'user-only').trim().toLowerCase();
  const scope: ResetCleanupScope = scopeRaw === 'user-and-shared-offers' ? 'user-and-shared-offers' : 'user-only';

  return {
    userIds: parseCsv(env.RESET_USER_IDS),
    userEmails: parseCsv(env.RESET_USER_EMAILS).map((item) => item.toLowerCase()),
    scope,
    includeProfileWorkflowData: parseBoolean(env.RESET_INCLUDE_PROFILE_WORKFLOW),
    applyChanges: parseBoolean(env.APPLY_CHANGES),
    confirmationToken: env.RESET_CONFIRM?.trim() || null,
  };
};

export const validateResetCleanupOptions = (options: ResetCleanupOptions) => {
  if (options.userIds.length === 0 && options.userEmails.length === 0) {
    throw new Error('Provide RESET_USER_IDS and/or RESET_USER_EMAILS for targeted cleanup.');
  }

  if (options.applyChanges && options.confirmationToken !== 'RESET_TEST_DATA') {
    throw new Error('APPLY_CHANGES=true requires RESET_CONFIRM=RESET_TEST_DATA.');
  }
};

export const buildResetCleanupPlan = (options: {
  scope: ResetCleanupScope;
  includeProfileWorkflowData: boolean;
}): ResetCleanupPlan => {
  const phases: ResetCleanupPlan['phases'] = [
    {
      key: 'workflow-links',
      label: 'Workflow-owned user state',
      steps: [
        'delete user_job_offers for target users',
        'delete job_matches for target users',
        'delete scrape_schedule_events for target users',
        'delete scrape_schedules for target users',
      ],
    },
    {
      key: 'run-ledger',
      label: 'Run and callback history owned by target users',
      steps: [
        'delete job_source_callback_events for target runs',
        'delete job_source_run_attempts for target runs',
        'delete scrape_execution_events for target runs',
        'delete worker_task_executions for target runs',
        'delete job_source_run_events for target runs',
        'delete job_source_runs for target users',
      ],
    },
  ];

  if (options.includeProfileWorkflowData) {
    phases.push({
      key: 'profile-workflow',
      label: 'Profile/document workflow restart',
      steps: [
        'delete notebook_preferences for target users',
        'delete onboarding_drafts for target users',
        'delete documents for target users',
        'delete profile_inputs for target users (career_profiles cascade)',
      ],
    });
  }

  if (options.scope === 'user-and-shared-offers') {
    phases.push({
      key: 'shared-offers',
      label: 'Shared canonical offers safe to remove',
      steps: [
        'delete target-linked job_offers not referenced by non-target users',
        'preserve offers with non-target links or non-target observations',
      ],
    });
  }

  phases.push({
    key: 'verification',
    label: 'Post-cleanup verification',
    steps: [
      'recount target-linked workflow rows',
      'confirm no orphaned user_job_offers remain for target users',
      'run reset-readiness verifier before destructive reseed or scrape validation',
    ],
  });

  return {
    scope: options.scope,
    includeProfileWorkflowData: options.includeProfileWorkflowData,
    phases,
  };
};

export const buildResetCleanupPreviewSummary = (
  preview: ResetCleanupPreview,
  options: {
    scope: ResetCleanupScope;
    includeProfileWorkflowData: boolean;
  },
) => ({
  scope: options.scope,
  includeProfileWorkflowData: options.includeProfileWorkflowData,
  targetUsers: preview.targetUsers,
  workflowRows: {
    userJobOffers: preview.userJobOffers,
    jobMatches: preview.jobMatches,
    schedules: preview.schedules,
    scheduleEvents: preview.scheduleEvents,
    runEvents: preview.runEvents,
    runAttempts: preview.runAttempts,
    callbackEvents: preview.callbackEvents,
    scrapeExecutionEvents: preview.scrapeExecutionEvents,
    workerTaskExecutions: preview.workerTaskExecutions,
  },
  profileWorkflowRows: options.includeProfileWorkflowData
    ? {
        careerProfiles: preview.careerProfiles,
        profileInputs: preview.profileInputs,
        notebookPreferences: preview.notebookPreferences,
        onboardingDrafts: preview.onboardingDrafts,
        documents: preview.documents,
      }
    : null,
  offerImpact: {
    targetRuns: preview.targetRuns,
    targetLinkedOffers: preview.targetLinkedOffers,
    targetRunOwnedOffers: preview.targetRunOwnedOffers,
    deletableSharedOffers: options.scope === 'user-and-shared-offers' ? preview.deletableSharedOffers : 0,
    preservedSharedOffers: options.scope === 'user-and-shared-offers' ? preview.preservedSharedOffers : 0,
  },
});

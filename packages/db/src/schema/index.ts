import * as enums from './_enums';
import * as users from './users';
import * as profiles from './profiles';
import * as sessions from './passport';
import * as otps from './otps';
import * as profileInputs from './profile-inputs';
import * as onboardingDrafts from './onboarding-drafts';
import * as notebookPreferences from './notebook-preferences';
import * as documents from './documents';
import * as documentEvents from './document-events';
import * as apiRequestEvents from './api-request-events';
import * as authorizationEvents from './authorization-events';
import * as documentStageMetrics from './document-stage-metrics';
import * as careerProfiles from './career-profiles';
import * as jobMatches from './job-matches';
import * as jobSourceRuns from './job-source-runs';
import * as jobSourceRunEvents from './job-source-run-events';
import * as jobSourceRunAttempts from './job-source-run-attempts';
import * as jobSourceCallbackEvents from './job-source-callback-events';
import * as scrapeSchedules from './scrape-schedules';
import * as scrapeScheduleEvents from './scrape-schedule-events';
import * as jobOffers from './job-offers';
import * as permissions from './permissions';
import * as rolePermissions from './role-permissions';
import * as roles from './roles';
import * as scrapeOutcomes from './scrape-outcomes';
import * as scrapeExecutionEvents from './scrape-execution-events';
import * as userJobOffers from './user-job-offers';
import * as relations from './_relations';

export * from './_enums';
export * from './users';
export * from './profiles';
export * from './passport';
export * from './otps';
export * from './profile-inputs';
export * from './onboarding-drafts';
export * from './notebook-preferences';
export * from './documents';
export * from './document-events';
export * from './api-request-events';
export * from './authorization-events';
export * from './document-stage-metrics';
export * from './career-profiles';
export * from './job-matches';
export * from './job-source-runs';
export * from './job-source-run-events';
export * from './job-source-run-attempts';
export * from './job-source-callback-events';
export * from './scrape-schedules';
export * from './scrape-schedule-events';
export * from './job-offers';
export * from './permissions';
export * from './role-permissions';
export * from './roles';
export * from './scrape-outcomes';
export * from './scrape-execution-events';
export * from './user-job-offers';
export * from './_relations';
export * from '../pracuj-filters';

export type Schema = typeof schema;

const schema = {
  ...enums,
  ...users,
  ...profiles,
  ...sessions,
  ...otps,
  ...profileInputs,
  ...onboardingDrafts,
  ...notebookPreferences,
  ...documents,
  ...documentEvents,
  ...apiRequestEvents,
  ...authorizationEvents,
  ...documentStageMetrics,
  ...careerProfiles,
  ...jobMatches,
  ...jobSourceRuns,
  ...jobSourceRunEvents,
  ...jobSourceRunAttempts,
  ...jobSourceCallbackEvents,
  ...scrapeSchedules,
  ...scrapeScheduleEvents,
  ...jobOffers,
  ...permissions,
  ...rolePermissions,
  ...roles,
  ...scrapeOutcomes,
  ...scrapeExecutionEvents,
  ...userJobOffers,
  ...relations,
};
export default schema;

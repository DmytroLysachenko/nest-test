import * as enums from './_enums';
import * as users from './users';
import * as profiles from './profiles';
import * as sessions from './passport';
import * as otps from './otps';
import * as profileInputs from './profile-inputs';
import * as onboardingDrafts from './onboarding-drafts';
import * as documents from './documents';
import * as documentEvents from './document-events';
import * as documentStageMetrics from './document-stage-metrics';
import * as careerProfiles from './career-profiles';
import * as jobMatches from './job-matches';
import * as jobSourceRuns from './job-source-runs';
import * as jobSourceCallbackEvents from './job-source-callback-events';
import * as jobOffers from './job-offers';
import * as userJobOffers from './user-job-offers';
import * as relations from './_relations';

export * from './_enums';
export * from './users';
export * from './profiles';
export * from './passport';
export * from './otps';
export * from './profile-inputs';
export * from './onboarding-drafts';
export * from './documents';
export * from './document-events';
export * from './document-stage-metrics';
export * from './career-profiles';
export * from './job-matches';
export * from './job-source-runs';
export * from './job-source-callback-events';
export * from './job-offers';
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
  ...documents,
  ...documentEvents,
  ...documentStageMetrics,
  ...careerProfiles,
  ...jobMatches,
  ...jobSourceRuns,
  ...jobSourceCallbackEvents,
  ...jobOffers,
  ...userJobOffers,
  ...relations,
};
export default schema;

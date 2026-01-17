import * as enums from './_enums';
import * as users from './users';
import * as profiles from './profiles';
import * as sessions from './passport';
import * as otps from './otps';
import * as profileInputs from './profile-inputs';
import * as documents from './documents';
import * as careerProfiles from './career-profiles';
import * as jobMatches from './job-matches';
import * as relations from './_relations';

export * from './_enums';
export * from './users';
export * from './profiles';
export * from './passport';
export * from './otps';
export * from './profile-inputs';
export * from './documents';
export * from './career-profiles';
export * from './job-matches';
export * from './_relations';

export type Schema = typeof schema;

const schema = {
  ...enums,
  ...users,
  ...profiles,
  ...sessions,
  ...otps,
  ...profileInputs,
  ...documents,
  ...careerProfiles,
  ...jobMatches,
  ...relations,
};
export default schema;

import { relations } from 'drizzle-orm';

import { usersTable } from './users';
import { profilesTable } from './profiles';
import { passportTable } from './passport';
import { profileInputsTable } from './profile-inputs';
import { onboardingDraftsTable } from './onboarding-drafts';
import { documentsTable } from './documents';
import { documentEventsTable } from './document-events';
import { careerProfilesTable } from './career-profiles';
import { jobMatchesTable } from './job-matches';
import { jobSourceRunsTable } from './job-source-runs';
import { jobOffersTable } from './job-offers';
import { userJobOffersTable } from './user-job-offers';

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [usersTable.id],
    references: [profilesTable.userId],
  }),
  passport: many(passportTable),
  profileInputs: many(profileInputsTable),
  onboardingDrafts: many(onboardingDraftsTable),
  documents: many(documentsTable),
  documentEvents: many(documentEventsTable),
  careerProfiles: many(careerProfilesTable),
  jobMatches: many(jobMatchesTable),
  jobOffers: many(userJobOffersTable),
}));

export const profilesRelations = relations(profilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [profilesTable.userId],
    references: [usersTable.id],
  }),
}));

export const passportRelations = relations(passportTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [passportTable.userId],
    references: [usersTable.id],
  }),
}));

export const profileInputsRelations = relations(profileInputsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [profileInputsTable.userId],
    references: [usersTable.id],
  }),
  careerProfiles: many(careerProfilesTable),
}));

export const onboardingDraftsRelations = relations(onboardingDraftsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [onboardingDraftsTable.userId],
    references: [usersTable.id],
  }),
}));

export const documentsRelations = relations(documentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [documentsTable.userId],
    references: [usersTable.id],
  }),
  events: many(documentEventsTable),
}));

export const documentEventsRelations = relations(documentEventsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentEventsTable.userId],
    references: [usersTable.id],
  }),
  document: one(documentsTable, {
    fields: [documentEventsTable.documentId],
    references: [documentsTable.id],
  }),
}));

export const careerProfilesRelations = relations(careerProfilesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [careerProfilesTable.userId],
    references: [usersTable.id],
  }),
  profileInput: one(profileInputsTable, {
    fields: [careerProfilesTable.profileInputId],
    references: [profileInputsTable.id],
  }),
  jobOffers: many(userJobOffersTable),
}));

export const jobMatchesRelations = relations(jobMatchesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [jobMatchesTable.userId],
    references: [usersTable.id],
  }),
  careerProfile: one(careerProfilesTable, {
    fields: [jobMatchesTable.careerProfileId],
    references: [careerProfilesTable.id],
  }),
}));

export const jobSourceRunsRelations = relations(jobSourceRunsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [jobSourceRunsTable.userId],
    references: [usersTable.id],
  }),
  careerProfile: one(careerProfilesTable, {
    fields: [jobSourceRunsTable.careerProfileId],
    references: [careerProfilesTable.id],
  }),
  jobOffers: many(jobOffersTable),
  userJobOffers: many(userJobOffersTable),
}));

export const jobOffersRelations = relations(jobOffersTable, ({ one, many }) => ({
  run: one(jobSourceRunsTable, {
    fields: [jobOffersTable.runId],
    references: [jobSourceRunsTable.id],
  }),
  userJobOffers: many(userJobOffersTable),
}));

export const userJobOffersRelations = relations(userJobOffersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userJobOffersTable.userId],
    references: [usersTable.id],
  }),
  careerProfile: one(careerProfilesTable, {
    fields: [userJobOffersTable.careerProfileId],
    references: [careerProfilesTable.id],
  }),
  jobOffer: one(jobOffersTable, {
    fields: [userJobOffersTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  sourceRun: one(jobSourceRunsTable, {
    fields: [userJobOffersTable.sourceRunId],
    references: [jobSourceRunsTable.id],
  }),
}));

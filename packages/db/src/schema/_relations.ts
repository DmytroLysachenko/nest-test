import { relations } from 'drizzle-orm';

import { usersTable } from './users';
import { profilesTable } from './profiles';
import { passportTable } from './passport';
import { profileInputsTable } from './profile-inputs';
import { documentsTable } from './documents';
import { careerProfilesTable } from './career-profiles';
import { jobMatchesTable } from './job-matches';
import { jobSourceRunsTable } from './job-source-runs';
import { jobOffersTable } from './job-offers';

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [usersTable.id],
    references: [profilesTable.userId],
  }),
  passport: many(passportTable),
  profileInputs: many(profileInputsTable),
  documents: many(documentsTable),
  careerProfiles: many(careerProfilesTable),
  jobMatches: many(jobMatchesTable),
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

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentsTable.userId],
    references: [usersTable.id],
  }),
}));

export const careerProfilesRelations = relations(careerProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [careerProfilesTable.userId],
    references: [usersTable.id],
  }),
  profileInput: one(profileInputsTable, {
    fields: [careerProfilesTable.profileInputId],
    references: [profileInputsTable.id],
  }),
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

export const jobSourceRunsRelations = relations(jobSourceRunsTable, ({ many }) => ({
  jobOffers: many(jobOffersTable),
}));

export const jobOffersRelations = relations(jobOffersTable, ({ one }) => ({
  run: one(jobSourceRunsTable, {
    fields: [jobOffersTable.runId],
    references: [jobSourceRunsTable.id],
  }),
}));

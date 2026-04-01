import { relations } from 'drizzle-orm';

import { usersTable } from './users';
import { profilesTable } from './profiles';
import { passportTable } from './passport';
import { profileInputsTable } from './profile-inputs';
import { onboardingDraftsTable } from './onboarding-drafts';
import { documentsTable } from './documents';
import { documentEventsTable } from './document-events';
import { documentStageMetricsTable } from './document-stage-metrics';
import { careerProfilesTable } from './career-profiles';
import { companiesTable } from './companies';
import { companyAliasesTable } from './company-aliases';
import { companySourceProfilesTable } from './company-source-profiles';
import { contractTypesTable } from './contract-types';
import { jobMatchesTable } from './job-matches';
import { employmentTypesTable } from './employment-types';
import { jobSourceRunsTable } from './job-source-runs';
import { jobSourceRunAttemptsTable } from './job-source-run-attempts';
import { jobOffersTable } from './job-offers';
import { jobOfferSourceObservationsTable } from './job-offer-source-observations';
import { jobOfferRawPayloadsTable } from './job-offer-raw-payloads';
import { jobOfferContractTypesTable } from './job-offer-contract-types';
import { jobOfferWorkModesTable } from './job-offer-work-modes';
import { jobOfferWorkSchedulesTable } from './job-offer-work-schedules';
import { jobOfferSeniorityLevelsTable } from './job-offer-seniority-levels';
import { jobOfferTechnologiesTable } from './job-offer-technologies';
import { jobCategoriesTable } from './job-categories';
import { seniorityLevelsTable } from './seniority-levels';
import { technologiesTable } from './technologies';
import { userJobOffersTable } from './user-job-offers';
import { workModesTable } from './work-modes';
import { workSchedulesTable } from './work-schedules';

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
  documentStageMetrics: many(documentStageMetricsTable),
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
  stageMetrics: many(documentStageMetricsTable),
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

export const documentStageMetricsRelations = relations(documentStageMetricsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentStageMetricsTable.userId],
    references: [usersTable.id],
  }),
  document: one(documentsTable, {
    fields: [documentStageMetricsTable.documentId],
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

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  aliases: many(companyAliasesTable),
  sourceProfiles: many(companySourceProfilesTable),
  jobOffers: many(jobOffersTable),
  observations: many(jobOfferSourceObservationsTable),
}));

export const companyAliasesRelations = relations(companyAliasesTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [companyAliasesTable.companyId],
    references: [companiesTable.id],
  }),
}));

export const companySourceProfilesRelations = relations(companySourceProfilesTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [companySourceProfilesTable.companyId],
    references: [companiesTable.id],
  }),
}));

export const jobCategoriesRelations = relations(jobCategoriesTable, ({ many }) => ({
  jobOffers: many(jobOffersTable),
}));

export const employmentTypesRelations = relations(employmentTypesTable, ({ many }) => ({
  jobOffers: many(jobOffersTable),
  observations: many(jobOfferSourceObservationsTable),
}));

export const contractTypesRelations = relations(contractTypesTable, ({ many }) => ({
  jobOffers: many(jobOffersTable),
  observations: many(jobOfferSourceObservationsTable),
  jobOfferRelations: many(jobOfferContractTypesTable),
}));

export const workModesRelations = relations(workModesTable, ({ many }) => ({
  jobOffers: many(jobOffersTable),
  observations: many(jobOfferSourceObservationsTable),
  jobOfferRelations: many(jobOfferWorkModesTable),
}));

export const workSchedulesRelations = relations(workSchedulesTable, ({ many }) => ({
  jobOfferRelations: many(jobOfferWorkSchedulesTable),
}));

export const seniorityLevelsRelations = relations(seniorityLevelsTable, ({ many }) => ({
  jobOfferRelations: many(jobOfferSeniorityLevelsTable),
}));

export const technologiesRelations = relations(technologiesTable, ({ many }) => ({
  jobOfferRelations: many(jobOfferTechnologiesTable),
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
  attempts: many(jobSourceRunAttemptsTable),
  jobOffers: many(jobOffersTable),
  observations: many(jobOfferSourceObservationsTable),
  userJobOffers: many(userJobOffersTable),
}));

export const jobSourceRunAttemptsRelations = relations(jobSourceRunAttemptsTable, ({ one }) => ({
  run: one(jobSourceRunsTable, {
    fields: [jobSourceRunAttemptsTable.sourceRunId],
    references: [jobSourceRunsTable.id],
  }),
}));

export const jobOffersRelations = relations(jobOffersTable, ({ one, many }) => ({
  run: one(jobSourceRunsTable, {
    fields: [jobOffersTable.runId],
    references: [jobSourceRunsTable.id],
  }),
  company: one(companiesTable, {
    fields: [jobOffersTable.companyId],
    references: [companiesTable.id],
  }),
  jobCategory: one(jobCategoriesTable, {
    fields: [jobOffersTable.jobCategoryId],
    references: [jobCategoriesTable.id],
  }),
  employmentTypeRef: one(employmentTypesTable, {
    fields: [jobOffersTable.employmentTypeId],
    references: [employmentTypesTable.id],
  }),
  contractTypeRef: one(contractTypesTable, {
    fields: [jobOffersTable.contractTypeId],
    references: [contractTypesTable.id],
  }),
  workModeRef: one(workModesTable, {
    fields: [jobOffersTable.workModeId],
    references: [workModesTable.id],
  }),
  observations: many(jobOfferSourceObservationsTable),
  contractTypes: many(jobOfferContractTypesTable),
  workModes: many(jobOfferWorkModesTable),
  workSchedules: many(jobOfferWorkSchedulesTable),
  seniorityLevels: many(jobOfferSeniorityLevelsTable),
  technologies: many(jobOfferTechnologiesTable),
  userJobOffers: many(userJobOffersTable),
}));

export const jobOfferSourceObservationsRelations = relations(jobOfferSourceObservationsTable, ({ one, many }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferSourceObservationsTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  run: one(jobSourceRunsTable, {
    fields: [jobOfferSourceObservationsTable.runId],
    references: [jobSourceRunsTable.id],
  }),
  company: one(companiesTable, {
    fields: [jobOfferSourceObservationsTable.companyId],
    references: [companiesTable.id],
  }),
  jobCategory: one(jobCategoriesTable, {
    fields: [jobOfferSourceObservationsTable.jobCategoryId],
    references: [jobCategoriesTable.id],
  }),
  employmentType: one(employmentTypesTable, {
    fields: [jobOfferSourceObservationsTable.employmentTypeId],
    references: [employmentTypesTable.id],
  }),
  contractType: one(contractTypesTable, {
    fields: [jobOfferSourceObservationsTable.contractTypeId],
    references: [contractTypesTable.id],
  }),
  workMode: one(workModesTable, {
    fields: [jobOfferSourceObservationsTable.workModeId],
    references: [workModesTable.id],
  }),
  rawPayloads: many(jobOfferRawPayloadsTable),
}));

export const jobOfferRawPayloadsRelations = relations(jobOfferRawPayloadsTable, ({ one }) => ({
  observation: one(jobOfferSourceObservationsTable, {
    fields: [jobOfferRawPayloadsTable.observationId],
    references: [jobOfferSourceObservationsTable.id],
  }),
}));

export const jobOfferContractTypesRelations = relations(jobOfferContractTypesTable, ({ one }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferContractTypesTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  contractType: one(contractTypesTable, {
    fields: [jobOfferContractTypesTable.contractTypeId],
    references: [contractTypesTable.id],
  }),
}));

export const jobOfferWorkModesRelations = relations(jobOfferWorkModesTable, ({ one }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferWorkModesTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  workMode: one(workModesTable, {
    fields: [jobOfferWorkModesTable.workModeId],
    references: [workModesTable.id],
  }),
}));

export const jobOfferWorkSchedulesRelations = relations(jobOfferWorkSchedulesTable, ({ one }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferWorkSchedulesTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  workSchedule: one(workSchedulesTable, {
    fields: [jobOfferWorkSchedulesTable.workScheduleId],
    references: [workSchedulesTable.id],
  }),
}));

export const jobOfferSeniorityLevelsRelations = relations(jobOfferSeniorityLevelsTable, ({ one }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferSeniorityLevelsTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  seniorityLevel: one(seniorityLevelsTable, {
    fields: [jobOfferSeniorityLevelsTable.seniorityLevelId],
    references: [seniorityLevelsTable.id],
  }),
}));

export const jobOfferTechnologiesRelations = relations(jobOfferTechnologiesTable, ({ one }) => ({
  jobOffer: one(jobOffersTable, {
    fields: [jobOfferTechnologiesTable.jobOfferId],
    references: [jobOffersTable.id],
  }),
  technology: one(technologiesTable, {
    fields: [jobOfferTechnologiesTable.technologyId],
    references: [technologiesTable.id],
  }),
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

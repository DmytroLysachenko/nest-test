import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobOfferQualityStateEnum, jobSourceEnum } from './_enums';
import { companiesTable } from './companies';
import { contractTypesTable } from './contract-types';
import { employmentTypesTable } from './employment-types';
import { jobCategoriesTable } from './job-categories';
import { jobOffersTable } from './job-offers';
import { jobSourceRunsTable } from './job-source-runs';
import { workModesTable } from './work-modes';

export const jobOfferSourceObservationsTable = pgTable(
  'job_offer_source_observations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => jobSourceRunsTable.id, { onDelete: 'set null' }),
    source: jobSourceEnum('source').notNull(),
    sourceId: text('source_id'),
    sourceCompanyProfileUrl: text('source_company_profile_url'),
    parserVersion: varchar('parser_version', { length: 64 }).notNull(),
    normalizationVersion: varchar('normalization_version', { length: 64 }).notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).defaultNow().notNull(),
    title: text('title').notNull(),
    company: text('company'),
    location: text('location'),
    salary: text('salary'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: varchar('salary_currency', { length: 16 }),
    salaryPeriod: varchar('salary_period', { length: 32 }),
    salaryKind: varchar('salary_kind', { length: 32 }),
    employmentType: text('employment_type'),
    applyUrl: text('apply_url'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    description: text('description').notNull(),
    requirements: jsonb('requirements'),
    details: jsonb('details'),
    contentHash: text('content_hash').notNull(),
    qualityState: jobOfferQualityStateEnum('quality_state').notNull().default('ACCEPTED'),
    qualityReason: text('quality_reason'),
    companyId: uuid('company_id').references(() => companiesTable.id, { onDelete: 'set null' }),
    jobCategoryId: uuid('job_category_id').references(() => jobCategoriesTable.id, { onDelete: 'set null' }),
    employmentTypeId: uuid('employment_type_id').references(() => employmentTypesTable.id, { onDelete: 'set null' }),
    contractTypeId: uuid('contract_type_id').references(() => contractTypesTable.id, { onDelete: 'set null' }),
    workModeId: uuid('work_mode_id').references(() => workModesTable.id, { onDelete: 'set null' }),
  },
  (table) => ({
    observationUnique: uniqueIndex('job_offer_source_observations_job_offer_content_hash_unique').on(
      table.jobOfferId,
      table.contentHash,
    ),
    jobOfferObservedAtIdx: index('job_offer_source_observations_job_offer_observed_at_idx').on(
      table.jobOfferId,
      table.observedAt.desc(),
    ),
    runObservedAtIdx: index('job_offer_source_observations_run_observed_at_idx').on(
      table.runId,
      table.observedAt.desc(),
    ),
    sourceSourceIdIdx: index('job_offer_source_observations_source_source_id_idx').on(table.source, table.sourceId),
  }),
);

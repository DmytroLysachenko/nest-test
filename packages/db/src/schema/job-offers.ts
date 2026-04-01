import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { jobOfferQualityStateEnum, jobSourceEnum } from './_enums';
import { companiesTable } from './companies';
import { contractTypesTable } from './contract-types';
import { employmentTypesTable } from './employment-types';
import { jobSourceRunsTable } from './job-source-runs';
import { jobCategoriesTable } from './job-categories';
import { workModesTable } from './work-modes';

export const jobOffersTable = pgTable(
  'job_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: jobSourceEnum('source').notNull(),
    sourceId: text('source_id'),
    offerIdentityKey: text('offer_identity_key'),
    runId: uuid('run_id').references(() => jobSourceRunsTable.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    title: text('title').notNull(),
    companyId: uuid('company_id').references(() => companiesTable.id, { onDelete: 'set null' }),
    jobCategoryId: uuid('job_category_id').references(() => jobCategoriesTable.id, { onDelete: 'set null' }),
    employmentTypeId: uuid('employment_type_id').references(() => employmentTypesTable.id, { onDelete: 'set null' }),
    contractTypeId: uuid('contract_type_id').references(() => contractTypesTable.id, { onDelete: 'set null' }),
    workModeId: uuid('work_mode_id').references(() => workModesTable.id, { onDelete: 'set null' }),
    company: text('company'),
    location: text('location'),
    salary: text('salary'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: varchar('salary_currency', { length: 16 }),
    salaryPeriod: varchar('salary_period', { length: 32 }),
    salaryKind: varchar('salary_kind', { length: 32 }),
    employmentType: text('employment_type'),
    sourceCompanyProfileUrl: text('source_company_profile_url'),
    applyUrl: text('apply_url'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    description: text('description').notNull(),
    requirements: jsonb('requirements'),
    details: jsonb('details'),
    contentHash: text('content_hash'),
    qualityState: jobOfferQualityStateEnum('quality_state').notNull().default('ACCEPTED'),
    qualityReason: text('quality_reason'),
    isExpired: boolean('is_expired').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastFullScrapeAt: timestamp('last_full_scrape_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastMatchedAt: timestamp('last_matched_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSourceUrl: uniqueIndex('job_offers_source_url_unique').on(table.source, table.url),
    uniqueSourceIdentityKey: uniqueIndex('job_offers_source_identity_key_unique').on(
      table.source,
      table.offerIdentityKey,
    ),
    sourceFetchedAtIdx: index('job_offers_source_fetched_at_idx').on(table.source, table.fetchedAt.desc()),
    sourceQualitySeenIdx: index('job_offers_source_quality_last_seen_idx').on(
      table.source,
      table.qualityState,
      table.lastSeenAt.desc(),
    ),
    sourceRunFetchedAtIdx: index('job_offers_source_run_fetched_at_idx').on(
      table.source,
      table.runId,
      table.fetchedAt.desc(),
    ),
    companyIdIdx: index('job_offers_company_id_idx').on(table.companyId),
    jobCategoryIdIdx: index('job_offers_job_category_id_idx').on(table.jobCategoryId),
    employmentTypeIdIdx: index('job_offers_employment_type_id_idx').on(table.employmentTypeId),
    contractTypeIdIdx: index('job_offers_contract_type_id_idx').on(table.contractTypeId),
    workModeIdIdx: index('job_offers_work_mode_id_idx').on(table.workModeId),
    sourceCompanyProfileUrlIdx: index('job_offers_source_company_profile_url_idx').on(table.sourceCompanyProfileUrl),
    salaryRangeIdx: index('job_offers_salary_range_idx').on(table.salaryCurrency, table.salaryMin, table.salaryMax),
    postedAtIdx: index('job_offers_posted_at_idx').on(table.postedAt.desc()),
  }),
);

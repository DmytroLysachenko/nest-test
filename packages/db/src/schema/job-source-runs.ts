import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceEnum, jobSourceRunStatusEnum } from './_enums';
import { careerProfilesTable } from './career-profiles';
import { usersTable } from './users';

export const jobSourceRunsTable = pgTable(
  'job_source_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: jobSourceEnum('source').notNull(),
    userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
    careerProfileId: uuid('career_profile_id').references(() => careerProfilesTable.id, { onDelete: 'set null' }),
    listingUrl: text('listing_url').notNull(),
    filters: jsonb('filters'),
    status: jobSourceRunStatusEnum('status').default('PENDING').notNull(),
    totalFound: integer('total_found'),
    scrapedCount: integer('scraped_count'),
    error: text('error'),
    failureType: varchar('failure_type', { length: 32 }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    retryOfRunId: uuid('retry_of_run_id').references((): any => jobSourceRunsTable.id, { onDelete: 'set null' }),
    retryCount: integer('retry_count').default(0).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userStatusCreatedAtIdx: index('job_source_runs_user_status_created_at_idx').on(
      table.userId,
      table.status,
      table.createdAt.desc(),
    ),
    statusCreatedAtIdx: index('job_source_runs_status_created_at_idx').on(table.status, table.createdAt.desc()),
    retryChainIdx: index('job_source_runs_retry_of_created_at_idx').on(table.retryOfRunId, table.createdAt.desc()),
  }),
);

import { index, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

import { jobSourceEnum } from './_enums';
import { jobSourceRunsTable } from './job-source-runs';

export const jobOffersTable = pgTable(
  'job_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: jobSourceEnum('source').notNull(),
    sourceId: text('source_id'),
    runId: uuid('run_id').references(() => jobSourceRunsTable.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    title: text('title').notNull(),
    company: text('company'),
    location: text('location'),
    salary: text('salary'),
    employmentType: text('employment_type'),
    description: text('description').notNull(),
    requirements: jsonb('requirements'),
    details: jsonb('details'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSourceUrl: uniqueIndex('job_offers_source_url_unique').on(table.source, table.url),
    sourceFetchedAtIdx: index('job_offers_source_fetched_at_idx').on(table.source, table.fetchedAt.desc()),
    sourceRunFetchedAtIdx: index('job_offers_source_run_fetched_at_idx').on(table.source, table.runId, table.fetchedAt.desc()),
  }),
);

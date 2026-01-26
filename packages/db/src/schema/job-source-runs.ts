import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { jobSourceEnum, jobSourceRunStatusEnum } from './_enums';

export const jobSourceRunsTable = pgTable('job_source_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: jobSourceEnum('source').notNull(),
  listingUrl: text('listing_url').notNull(),
  filters: jsonb('filters'),
  status: jobSourceRunStatusEnum('status').default('PENDING').notNull(),
  totalFound: integer('total_found'),
  scrapedCount: integer('scraped_count'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

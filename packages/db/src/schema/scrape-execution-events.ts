import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';

export const scrapeExecutionEventsTable = pgTable(
  'scrape_execution_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceRunId: uuid('source_run_id')
      .notNull()
      .references(() => jobSourceRunsTable.id, { onDelete: 'cascade' }),
    traceId: uuid('trace_id'),
    requestId: varchar('request_id', { length: 128 }),
    stage: varchar('stage', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    code: varchar('code', { length: 128 }),
    message: text('message').notNull(),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runCreatedAtIdx: index('scrape_execution_events_run_created_at_idx').on(table.sourceRunId, table.createdAt.desc()),
    stageCreatedAtIdx: index('scrape_execution_events_stage_created_at_idx').on(table.stage, table.createdAt.desc()),
    requestCreatedAtIdx: index('scrape_execution_events_request_created_at_idx').on(
      table.requestId,
      table.createdAt.desc(),
    ),
  }),
);

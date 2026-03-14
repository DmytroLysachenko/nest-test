import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';

export const jobSourceRunEventsTable = pgTable(
  'job_source_run_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceRunId: uuid('source_run_id')
      .notNull()
      .references(() => jobSourceRunsTable.id, { onDelete: 'cascade' }),
    traceId: uuid('trace_id').notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 16 }).default('info').notNull(),
    requestId: varchar('request_id', { length: 128 }),
    phase: varchar('phase', { length: 64 }),
    attemptNo: integer('attempt_no'),
    code: varchar('code', { length: 128 }),
    message: text('message').notNull(),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runCreatedAtIdx: index('job_source_run_events_run_created_at_idx').on(table.sourceRunId, table.createdAt.desc()),
    traceCreatedAtIdx: index('job_source_run_events_trace_created_at_idx').on(table.traceId, table.createdAt.desc()),
    eventTypeCreatedAtIdx: index('job_source_run_events_type_created_at_idx').on(
      table.eventType,
      table.createdAt.desc(),
    ),
  }),
);

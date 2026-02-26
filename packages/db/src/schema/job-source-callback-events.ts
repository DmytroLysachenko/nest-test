import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';

export const jobSourceCallbackEventsTable = pgTable(
  'job_source_callback_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceRunId: uuid('source_run_id')
      .notNull()
      .references(() => jobSourceRunsTable.id, { onDelete: 'cascade' }),
    eventId: varchar('event_id', { length: 128 }).notNull(),
    requestId: varchar('request_id', { length: 128 }),
    status: varchar('status', { length: 32 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    payload: text('payload'),
  },
  (table) => ({
    runEventUniqueIdx: uniqueIndex('job_source_callback_events_run_event_uidx').on(table.sourceRunId, table.eventId),
    runReceivedAtIdx: index('job_source_callback_events_run_received_at_idx').on(
      table.sourceRunId,
      table.receivedAt.desc(),
    ),
  }),
);

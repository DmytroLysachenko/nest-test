import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';
import { scrapeSchedulesTable } from './scrape-schedules';
import { usersTable } from './users';

export const scrapeScheduleEventsTable = pgTable(
  'scrape_schedule_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => scrapeSchedulesTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    sourceRunId: uuid('source_run_id').references(() => jobSourceRunsTable.id, { onDelete: 'set null' }),
    traceId: uuid('trace_id'),
    requestId: varchar('request_id', { length: 128 }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 16 }).default('info').notNull(),
    code: varchar('code', { length: 128 }),
    message: text('message').notNull(),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scheduleCreatedAtIdx: index('scrape_schedule_events_schedule_created_at_idx').on(
      table.scheduleId,
      table.createdAt.desc(),
    ),
    userCreatedAtIdx: index('scrape_schedule_events_user_created_at_idx').on(table.userId, table.createdAt.desc()),
    sourceRunCreatedAtIdx: index('scrape_schedule_events_source_run_created_at_idx').on(
      table.sourceRunId,
      table.createdAt.desc(),
    ),
    eventTypeCreatedAtIdx: index('scrape_schedule_events_type_created_at_idx').on(
      table.eventType,
      table.createdAt.desc(),
    ),
  }),
);

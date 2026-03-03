import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';

export const jobSourceRunAttemptsTable = pgTable(
  'job_source_run_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceRunId: uuid('source_run_id')
      .notNull()
      .references(() => jobSourceRunsTable.id, { onDelete: 'cascade' }),
    attemptNo: integer('attempt_no').notNull(),
    queueTaskName: text('queue_task_name'),
    queueProvider: varchar('queue_provider', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failureType: varchar('failure_type', { length: 32 }),
    failureCode: varchar('failure_code', { length: 128 }),
    error: text('error'),
    payloadHash: varchar('payload_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runAttemptUniqueIdx: uniqueIndex('job_source_run_attempts_run_attempt_uidx').on(table.sourceRunId, table.attemptNo),
    runCreatedAtIdx: index('job_source_run_attempts_run_created_at_idx').on(table.sourceRunId, table.createdAt.desc()),
  }),
);

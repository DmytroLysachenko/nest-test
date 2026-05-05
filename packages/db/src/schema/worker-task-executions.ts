import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobSourceRunsTable } from './job-source-runs';

export const workerTaskExecutionsTable = pgTable(
  'worker_task_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceRunId: uuid('source_run_id')
      .notNull()
      .references(() => jobSourceRunsTable.id, { onDelete: 'cascade' }),
    taskId: varchar('task_id', { length: 128 }).notNull(),
    traceId: uuid('trace_id'),
    requestId: varchar('request_id', { length: 128 }),
    dedupeKey: varchar('dedupe_key', { length: 128 }),
    queueProvider: varchar('queue_provider', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    error: text('error'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    sourceRunUniqueIdx: uniqueIndex('worker_task_executions_source_run_uidx').on(table.sourceRunId),
    taskIdUniqueIdx: uniqueIndex('worker_task_executions_task_id_uidx').on(table.taskId),
    statusLeaseIdx: index('worker_task_executions_status_lease_idx').on(table.status, table.leaseExpiresAt),
    traceCreatedAtIdx: index('worker_task_executions_trace_created_at_idx').on(table.traceId, table.createdAt.desc()),
  }),
);

import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { documentsTable } from './documents';
import { usersTable } from './users';

export const documentStageMetricsTable = pgTable(
  'document_stage_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documentsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    stage: varchar('stage', { length: 32 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userStageCreatedAtIdx: index('document_stage_metrics_user_stage_created_at_idx').on(
      table.userId,
      table.stage,
      table.createdAt.desc(),
    ),
    stageCreatedAtIdx: index('document_stage_metrics_stage_created_at_idx').on(table.stage, table.createdAt.desc()),
    documentCreatedAtIdx: index('document_stage_metrics_document_created_at_idx').on(
      table.documentId,
      table.createdAt.desc(),
    ),
  }),
);

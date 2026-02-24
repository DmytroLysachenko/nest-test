import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { documentsTable } from './documents';
import { usersTable } from './users';

export const documentEventsTable = pgTable(
  'document_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documentsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    stage: varchar('stage', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    message: text('message').notNull(),
    errorCode: varchar('error_code', { length: 64 }),
    traceId: varchar('trace_id', { length: 128 }),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentCreatedAtIdx: index('document_events_document_created_at_idx').on(table.documentId, table.createdAt.desc()),
    userCreatedAtIdx: index('document_events_user_created_at_idx').on(table.userId, table.createdAt.desc()),
  }),
);


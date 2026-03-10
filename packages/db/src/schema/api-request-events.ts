import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const apiRequestEventsTable = pgTable(
  'api_request_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
    requestId: varchar('request_id', { length: 128 }),
    level: varchar('level', { length: 16 }).notNull(),
    method: varchar('method', { length: 16 }).notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code').notNull(),
    message: text('message').notNull(),
    errorCode: varchar('error_code', { length: 128 }),
    details: text('details').array(),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    requestCreatedAtIdx: index('api_request_events_request_created_at_idx').on(table.requestId, table.createdAt.desc()),
    userCreatedAtIdx: index('api_request_events_user_created_at_idx').on(table.userId, table.createdAt.desc()),
    levelCreatedAtIdx: index('api_request_events_level_created_at_idx').on(table.level, table.createdAt.desc()),
  }),
);

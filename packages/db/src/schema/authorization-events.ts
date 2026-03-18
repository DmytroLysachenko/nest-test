import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const authorizationEventsTable = pgTable(
  'authorization_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
    role: varchar('role', { length: 64 }),
    permission: varchar('permission', { length: 128 }),
    resource: varchar('resource', { length: 128 }),
    action: varchar('action', { length: 32 }).notNull(),
    outcome: varchar('outcome', { length: 16 }).notNull(),
    requestId: varchar('request_id', { length: 128 }),
    method: varchar('method', { length: 16 }),
    path: text('path'),
    reason: text('reason'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index('authorization_events_user_created_at_idx').on(table.userId, table.createdAt.desc()),
    permissionCreatedAtIdx: index('authorization_events_permission_created_at_idx').on(
      table.permission,
      table.createdAt.desc(),
    ),
    requestCreatedAtIdx: index('authorization_events_request_created_at_idx').on(
      table.requestId,
      table.createdAt.desc(),
    ),
  }),
);

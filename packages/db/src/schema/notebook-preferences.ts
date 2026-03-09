import { index, jsonb, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const notebookPreferencesTable = pgTable(
  'notebook_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    filters: jsonb('filters').notNull(),
    savedPreset: jsonb('saved_preset'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUniqueIdx: uniqueIndex('notebook_preferences_user_uidx').on(table.userId),
    userUpdatedAtIdx: index('notebook_preferences_user_updated_at_idx').on(table.userId, table.updatedAt.desc()),
  }),
);

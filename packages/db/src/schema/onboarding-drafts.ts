import { index, jsonb, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const onboardingDraftsTable = pgTable(
  'onboarding_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index('onboarding_drafts_user_id_idx').on(table.userId),
    userUnique: unique('onboarding_drafts_user_id_unique').on(table.userId),
  }),
);

import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const profileInputsTable = pgTable('profile_inputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  targetRoles: text('target_roles').notNull(),
  notes: text('notes'),
  intakePayload: jsonb('intake_payload'),
  normalizedInput: jsonb('normalized_input'),
  normalizationMeta: jsonb('normalization_meta'),
  normalizationVersion: varchar('normalization_version', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date()),
});

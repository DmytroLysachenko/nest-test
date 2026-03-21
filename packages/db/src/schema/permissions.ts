import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const permissionsTable = pgTable('permissions', {
  key: varchar('key', { length: 128 }).primaryKey(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

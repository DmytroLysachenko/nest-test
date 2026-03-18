import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const rolesTable = pgTable('roles', {
  name: varchar('name', { length: 64 }).primaryKey(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

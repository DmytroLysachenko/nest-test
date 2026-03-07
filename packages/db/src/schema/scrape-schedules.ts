import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { usersTable } from './users';

export const scrapeSchedulesTable = pgTable(
  'scrape_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    enabled: integer('enabled').notNull().default(0),
    cron: varchar('cron', { length: 128 }).notNull().default('0 9 * * *'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Warsaw'),
    source: varchar('source', { length: 32 }).notNull().default('pracuj-pl-it'),
    limit: integer('limit').notNull().default(20),
    careerProfileId: uuid('career_profile_id'),
    filters: jsonb('filters'),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    lastRunStatus: varchar('last_run_status', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userUniqueIdx: uniqueIndex('scrape_schedules_user_unique_idx').on(table.userId),
    enabledUpdatedIdx: index('scrape_schedules_enabled_updated_idx').on(table.enabled, table.updatedAt.desc()),
  }),
);

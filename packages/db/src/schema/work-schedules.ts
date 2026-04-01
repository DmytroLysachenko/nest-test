import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const workSchedulesTable = pgTable(
  'work_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 64 }).notNull(),
    label: varchar('label', { length: 128 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex('work_schedules_slug_unique').on(table.slug),
    labelIdx: index('work_schedules_label_idx').on(table.label),
  }),
);

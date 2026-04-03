import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const seniorityLevelsTable = pgTable(
  'seniority_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 64 }).notNull(),
    label: varchar('label', { length: 128 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex('seniority_levels_slug_unique').on(table.slug),
    labelIdx: index('seniority_levels_label_idx').on(table.label),
  }),
);

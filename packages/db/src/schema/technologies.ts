import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const technologiesTable = pgTable(
  'technologies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 128 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex('technologies_slug_unique').on(table.slug),
    labelIdx: index('technologies_label_idx').on(table.label),
  }),
);

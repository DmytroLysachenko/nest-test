import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { companiesTable } from './companies';

export const companyAliasesTable = pgTable(
  'company_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 255 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 255 }).notNull(),
    source: varchar('source', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    normalizedAliasUnique: uniqueIndex('company_aliases_normalized_alias_unique').on(table.normalizedAlias),
    companyIdIdx: index('company_aliases_company_id_idx').on(table.companyId),
  }),
);

import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { companiesTable } from './companies';

export const companySourceProfilesTable = pgTable(
  'company_source_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 64 }).notNull(),
    sourceCompanyKey: varchar('source_company_key', { length: 255 }),
    sourceProfileUrl: text('source_profile_url'),
    displayName: varchar('display_name', { length: 255 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceProfileUrlUnique: uniqueIndex('company_source_profiles_source_profile_url_unique').on(
      table.source,
      table.sourceProfileUrl,
    ),
    sourceCompanyKeyUnique: uniqueIndex('company_source_profiles_source_company_key_unique').on(
      table.source,
      table.sourceCompanyKey,
    ),
    companyIdx: index('company_source_profiles_company_idx').on(table.companyId),
  }),
);

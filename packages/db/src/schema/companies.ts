import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const companiesTable = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canonicalName: varchar('canonical_name', { length: 255 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 255 }).notNull(),
    primarySource: varchar('primary_source', { length: 64 }),
    sourceProfileUrl: text('source_profile_url'),
    websiteUrl: text('website_url'),
    logoUrl: text('logo_url'),
    description: text('description'),
    hqLocation: varchar('hq_location', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    normalizedNameUnique: uniqueIndex('companies_normalized_name_unique').on(table.normalizedName),
    canonicalNameIdx: index('companies_canonical_name_idx').on(table.canonicalName),
    lastSeenAtIdx: index('companies_last_seen_at_idx').on(table.lastSeenAt.desc()),
  }),
);

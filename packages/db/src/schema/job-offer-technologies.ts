import { index, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobOffersTable } from './job-offers';
import { technologiesTable } from './technologies';

export const jobOfferTechnologiesTable = pgTable(
  'job_offer_technologies',
  {
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    technologyId: uuid('technology_id')
      .notNull()
      .references(() => technologiesTable.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 32 }).notNull().default('all'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.jobOfferId, table.technologyId, table.category],
      name: 'job_offer_technologies_pk',
    }),
    technologyIdx: index('job_offer_technologies_technology_idx').on(table.technologyId),
  }),
);

import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { jobOffersTable } from './job-offers';
import { seniorityLevelsTable } from './seniority-levels';

export const jobOfferSeniorityLevelsTable = pgTable(
  'job_offer_seniority_levels',
  {
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    seniorityLevelId: uuid('seniority_level_id')
      .notNull()
      .references(() => seniorityLevelsTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobOfferId, table.seniorityLevelId], name: 'job_offer_seniority_levels_pk' }),
    seniorityLevelIdx: index('job_offer_seniority_levels_seniority_idx').on(table.seniorityLevelId),
  }),
);

import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { jobOffersTable } from './job-offers';
import { workModesTable } from './work-modes';

export const jobOfferWorkModesTable = pgTable(
  'job_offer_work_modes',
  {
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    workModeId: uuid('work_mode_id')
      .notNull()
      .references(() => workModesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobOfferId, table.workModeId], name: 'job_offer_work_modes_pk' }),
    workModeIdx: index('job_offer_work_modes_work_mode_idx').on(table.workModeId),
  }),
);

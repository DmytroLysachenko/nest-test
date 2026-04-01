import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { jobOffersTable } from './job-offers';
import { workSchedulesTable } from './work-schedules';

export const jobOfferWorkSchedulesTable = pgTable(
  'job_offer_work_schedules',
  {
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    workScheduleId: uuid('work_schedule_id')
      .notNull()
      .references(() => workSchedulesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobOfferId, table.workScheduleId], name: 'job_offer_work_schedules_pk' }),
    workScheduleIdx: index('job_offer_work_schedules_work_schedule_idx').on(table.workScheduleId),
  }),
);

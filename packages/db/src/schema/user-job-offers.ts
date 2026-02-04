import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { jobOfferStatusEnum } from './_enums';
import { careerProfilesTable } from './career-profiles';
import { jobOffersTable } from './job-offers';
import { jobSourceRunsTable } from './job-source-runs';
import { usersTable } from './users';

export const userJobOffersTable = pgTable(
  'user_job_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    careerProfileId: uuid('career_profile_id')
      .notNull()
      .references(() => careerProfilesTable.id, { onDelete: 'cascade' }),
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    sourceRunId: uuid('source_run_id').references(() => jobSourceRunsTable.id, { onDelete: 'set null' }),
    status: jobOfferStatusEnum('status').default('NEW').notNull(),
    matchScore: integer('match_score'),
    matchMeta: jsonb('match_meta'),
    notes: text('notes'),
    tags: jsonb('tags'),
    statusHistory: jsonb('status_history'),
    lastStatusAt: timestamp('last_status_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserOffer: uniqueIndex('user_job_offers_unique').on(
      table.userId,
      table.careerProfileId,
      table.jobOfferId,
    ),
  }),
);

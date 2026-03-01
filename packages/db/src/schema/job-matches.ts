import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { careerProfilesTable } from './career-profiles';
import { usersTable } from './users';

export const jobMatchesTable = pgTable(
  'job_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    careerProfileId: uuid('career_profile_id')
      .notNull()
      .references(() => careerProfilesTable.id, { onDelete: 'cascade' }),
    profileVersion: integer('profile_version').notNull(),
    jobDescription: text('job_description').notNull(),
    score: integer('score').notNull(),
    minScore: integer('min_score'),
    isMatch: boolean('is_match').notNull().default(false),
    matchedSkills: jsonb('matched_skills'),
    matchedRoles: jsonb('matched_roles'),
    matchedStrengths: jsonb('matched_strengths'),
    matchedKeywords: jsonb('matched_keywords'),
    matchMeta: jsonb('match_meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index('job_matches_user_created_at_idx').on(table.userId, table.createdAt.desc()),
    userMatchScoreIdx: index('job_matches_user_is_match_score_idx').on(table.userId, table.isMatch, table.score.desc()),
  }),
);

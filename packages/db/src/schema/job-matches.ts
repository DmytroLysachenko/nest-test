import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { careerProfilesTable } from './career-profiles';
import { usersTable } from './users';

export const jobMatchesTable = pgTable('job_matches', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

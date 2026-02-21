import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { careerProfileStatusEnum } from './_enums';
import { profileInputsTable } from './profile-inputs';
import { usersTable } from './users';

export const careerProfilesTable = pgTable(
  'career_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    profileInputId: uuid('profile_input_id')
      .notNull()
      .references(() => profileInputsTable.id, { onDelete: 'cascade' }),
    documentIds: text('document_ids'),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    status: careerProfileStatusEnum('status').default('PENDING').notNull(),
    content: text('content'),
    contentJson: jsonb('content_json'),
    primarySeniority: varchar('primary_seniority', { length: 32 }),
    targetRoles: text('target_roles').array(),
    searchableKeywords: text('searchable_keywords').array(),
    searchableTechnologies: text('searchable_technologies').array(),
    preferredWorkModes: text('preferred_work_modes').array(),
    preferredEmploymentTypes: text('preferred_employment_types').array(),
    model: varchar('model', { length: 100 }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userActiveStatusCreatedAtIdx: index('career_profiles_user_active_status_created_at_idx').on(
      table.userId,
      table.isActive,
      table.status,
      table.createdAt.desc(),
    ),
    userActiveSeniorityIdx: index('career_profiles_user_active_seniority_idx').on(
      table.userId,
      table.isActive,
      table.primarySeniority,
    ),
  }),
);

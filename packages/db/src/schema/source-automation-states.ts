import { index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { jobSourceEnum } from './_enums';

export const sourceAutomationStatesTable = pgTable(
  'source_automation_states',
  {
    source: jobSourceEnum('source').primaryKey(),
    pausedReason: varchar('paused_reason', { length: 64 }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
    failureMix: jsonb('failure_mix').$type<Record<string, number>>(),
    overrideClearedAt: timestamp('override_cleared_at', { withTimezone: true }),
    overrideNote: varchar('override_note', { length: 256 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    expiresAtIdx: index('source_automation_states_expires_at_idx').on(table.expiresAt),
  }),
);

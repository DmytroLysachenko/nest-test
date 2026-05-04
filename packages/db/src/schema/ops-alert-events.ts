import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const opsAlertEventsTable = pgTable(
  'ops_alert_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: varchar('channel', { length: 32 }).notNull(),
    alertKey: varchar('alert_key', { length: 128 }).notNull(),
    payloadHash: varchar('payload_hash', { length: 128 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    httpStatus: integer('http_status'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    error: text('error'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    alertKeyCreatedAtIdx: index('ops_alert_events_alert_key_created_at_idx').on(table.alertKey, table.createdAt.desc()),
    statusCreatedAtIdx: index('ops_alert_events_status_created_at_idx').on(table.status, table.createdAt.desc()),
    payloadHashCreatedAtIdx: index('ops_alert_events_payload_hash_created_at_idx').on(
      table.payloadHash,
      table.createdAt.desc(),
    ),
  }),
);

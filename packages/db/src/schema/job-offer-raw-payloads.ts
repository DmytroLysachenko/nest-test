import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { jobOfferSourceObservationsTable } from './job-offer-source-observations';

export const jobOfferRawPayloadsTable = pgTable(
  'job_offer_raw_payloads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    observationId: uuid('observation_id')
      .notNull()
      .references(() => jobOfferSourceObservationsTable.id, { onDelete: 'cascade' }),
    payloadType: varchar('payload_type', { length: 64 }).notNull(),
    payloadJson: jsonb('payload_json'),
    payloadText: text('payload_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    observationPayloadUnique: uniqueIndex('job_offer_raw_payloads_observation_payload_type_unique').on(
      table.observationId,
      table.payloadType,
    ),
    observationIdx: index('job_offer_raw_payloads_observation_idx').on(table.observationId),
  }),
);

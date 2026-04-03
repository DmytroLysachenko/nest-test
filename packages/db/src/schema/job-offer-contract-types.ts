import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { contractTypesTable } from './contract-types';
import { jobOffersTable } from './job-offers';

export const jobOfferContractTypesTable = pgTable(
  'job_offer_contract_types',
  {
    jobOfferId: uuid('job_offer_id')
      .notNull()
      .references(() => jobOffersTable.id, { onDelete: 'cascade' }),
    contractTypeId: uuid('contract_type_id')
      .notNull()
      .references(() => contractTypesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.jobOfferId, table.contractTypeId], name: 'job_offer_contract_types_pk' }),
    contractTypeIdx: index('job_offer_contract_types_contract_type_idx').on(table.contractTypeId),
  }),
);

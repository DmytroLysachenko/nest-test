import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { documentTypeEnum } from './_enums';
import { usersTable } from './users';

export const documentsTable = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').default('OTHER').notNull(),
  storagePath: text('storage_path').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

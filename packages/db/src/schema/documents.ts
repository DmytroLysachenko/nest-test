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
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

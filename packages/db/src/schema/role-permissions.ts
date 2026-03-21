import { index, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

import { permissionsTable } from './permissions';
import { rolesTable } from './roles';

export const rolePermissionsTable = pgTable(
  'role_permissions',
  {
    roleName: varchar('role_name', { length: 64 })
      .notNull()
      .references(() => rolesTable.name, { onDelete: 'cascade' }),
    permissionKey: varchar('permission_key', { length: 128 })
      .notNull()
      .references(() => permissionsTable.key, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleName, table.permissionKey], name: 'role_permissions_pk' }),
    permissionIdx: index('role_permissions_permission_idx').on(table.permissionKey),
  }),
);

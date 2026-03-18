import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { rolePermissionsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

@Injectable()
export class AuthorizationService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async getPermissionsForRole(role: string | null | undefined) {
    const normalizedRole = role?.trim().toLowerCase();
    if (!normalizedRole) {
      return [];
    }

    const rows = await this.db
      .select({
        permissionKey: rolePermissionsTable.permissionKey,
      })
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleName, normalizedRole));

    return Array.from(new Set(rows.map((row) => row.permissionKey)));
  }
}

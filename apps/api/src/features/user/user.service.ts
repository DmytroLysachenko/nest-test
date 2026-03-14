import { Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { usersTable } from '@repo/db';
import { eq } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import { TokenService } from '@/features/auth/token.service';

@Injectable()
export class UserService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly tokenService: TokenService,
  ) {}

  async getUser(id: string) {
    return this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
      .then(([user]) => user);
  }

  async deleteUser(id: string) {
    const now = new Date();
    const [deletedUser] = await this.db
      .update(usersTable)
      .set({
        isActive: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        deletedAt: usersTable.deletedAt,
      });

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    await this.tokenService.removeToken(id);

    return {
      ok: true,
      userId: deletedUser.id,
      deletedAt: deletedUser.deletedAt?.toISOString() ?? now.toISOString(),
    };
  }
}

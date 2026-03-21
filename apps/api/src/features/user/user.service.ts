import { Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { usersTable } from '@repo/db';
import { eq } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import { AuthorizationEventsService } from '@/common/authorization/authorization-events.service';
import { TokenService } from '@/features/auth/token.service';
import { AuthorizationService } from '@/common/authorization/authorization.service';

@Injectable()
export class UserService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly tokenService: TokenService,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationEventsService: AuthorizationEventsService,
  ) {}

  async getUser(id: string) {
    const user = await this.db
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
      .then(([result]) => result);

    if (!user) {
      return user;
    }

    return {
      ...user,
      permissions: await this.authorizationService.getPermissionsForRole(user.role),
    };
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

  async getUserRole(id: string) {
    const user = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
      .then(([result]) => result);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      permissions: await this.authorizationService.getPermissionsForRole(user.role),
    };
  }

  async updateUserRole(
    actor: { userId: string; role: string; permissions: string[] },
    targetUserId: string,
    nextRole: 'user' | 'admin',
    requestMeta?: { requestId?: string | null; method?: string | null; path?: string | null },
  ) {
    const [updated] = await this.db
      .update(usersTable)
      .set({
        role: nextRole,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, targetUserId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    await this.authorizationEventsService.create({
      userId: actor.userId,
      role: actor.role,
      permission: 'user.manage',
      resource: `user:${targetUserId}`,
      action: 'allow',
      outcome: 'success',
      requestId: requestMeta?.requestId ?? null,
      method: requestMeta?.method ?? null,
      path: requestMeta?.path ?? null,
      reason: 'role-updated',
      meta: {
        targetUserId,
        nextRole,
      },
    });

    return {
      ...updated,
      permissions: await this.authorizationService.getPermissionsForRole(updated.role),
    };
  }
}

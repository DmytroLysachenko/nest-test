import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Role } from '../auth/role.enum';
import { DRIZZLE_DB } from '../database/database.service';
import * as schema from '../database/schema';
import { accounts, users } from '../database/schema';
import { SafeUser, User } from './user.entity';

type UserRow = InferSelectModel<typeof users>;

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private mapUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async upsertUser(payload: {
    id?: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: Role;
  }): Promise<User> {
    const existing = await this.findByEmail(payload.email);
    if (existing) {
      return existing;
    }

    const [inserted] = await this.db
      .insert(users)
      .values({
        id: payload.id ?? randomUUID(),
        email: payload.email.toLowerCase(),
        displayName: payload.displayName,
        passwordHash: payload.passwordHash,
        role: payload.role,
      })
      .returning();

    return this.mapUser(inserted);
  }

  async linkAccount(
    user: SafeUser,
    provider: string,
    providerAccountId: string,
  ) {
    await this.db
      .insert(accounts)
      .values({
        userId: user.id,
        provider,
        providerAccountId,
      })
      .onConflictDoNothing();
  }
}

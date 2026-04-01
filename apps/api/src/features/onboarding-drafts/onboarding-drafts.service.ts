import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { onboardingDraftsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

@Injectable()
export class OnboardingDraftsService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async getLatest(userId: string) {
    const [item] = await this.db
      .select()
      .from(onboardingDraftsTable)
      .where(eq(onboardingDraftsTable.userId, userId))
      .orderBy(desc(onboardingDraftsTable.updatedAt))
      .limit(1);

    return item ?? null;
  }

  async upsert(userId: string, payload: Record<string, unknown>) {
    const [draft] = await this.db
      .insert(onboardingDraftsTable)
      .values({
        userId,
        payload,
      })
      .onConflictDoUpdate({
        target: onboardingDraftsTable.userId,
        set: {
          payload,
          updatedAt: new Date(),
        },
      })
      .returning();

    return draft ?? this.getLatest(userId);
  }

  async remove(userId: string) {
    await this.db.delete(onboardingDraftsTable).where(eq(onboardingDraftsTable.userId, userId));
    return { ok: true };
  }
}

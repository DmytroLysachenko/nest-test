import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { careerProfilesTable, jobSourceRunsTable, profileInputsTable, userJobOffersTable } from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Drizzle } from '@/common/decorators';

@Injectable()
export class WorkspaceService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async getSummary(userId: string) {
    const [profileInput] = await this.db
      .select({
        id: profileInputsTable.id,
        updatedAt: profileInputsTable.updatedAt,
      })
      .from(profileInputsTable)
      .where(eq(profileInputsTable.userId, userId))
      .orderBy(desc(profileInputsTable.updatedAt))
      .limit(1);

    const [profile] = await this.db
      .select({
        id: careerProfilesTable.id,
        status: careerProfilesTable.status,
        version: careerProfilesTable.version,
        updatedAt: careerProfilesTable.updatedAt,
      })
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.updatedAt))
      .limit(1);

    const [offersTotal] = await this.db
      .select({ value: count() })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId));

    const [offersScored] = await this.db
      .select({ value: count() })
      .from(userJobOffersTable)
      .where(and(eq(userJobOffersTable.userId, userId), isNotNull(userJobOffersTable.matchScore)));

    const [lastOffer] = await this.db
      .select({ updatedAt: userJobOffersTable.updatedAt })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId))
      .orderBy(desc(userJobOffersTable.updatedAt))
      .limit(1);

    const [runTotal] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.userId, userId));

    const [latestRun] = await this.db
      .select({
        status: jobSourceRunsTable.status,
        createdAt: jobSourceRunsTable.createdAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.userId, userId))
      .orderBy(desc(jobSourceRunsTable.createdAt))
      .limit(1);

    const needsOnboarding = !profileInput || !profile || profile.status !== 'READY';

    return {
      profile: {
        exists: Boolean(profile),
        status: profile?.status ?? null,
        version: profile?.version ?? null,
        updatedAt: profile?.updatedAt ?? null,
      },
      profileInput: {
        exists: Boolean(profileInput),
        updatedAt: profileInput?.updatedAt ?? null,
      },
      offers: {
        total: Number(offersTotal?.value ?? 0),
        scored: Number(offersScored?.value ?? 0),
        lastUpdatedAt: lastOffer?.updatedAt ?? null,
      },
      scrape: {
        lastRunStatus: latestRun?.status ?? null,
        lastRunAt: latestRun?.createdAt ?? null,
        totalRuns: Number(runTotal?.value ?? 0),
      },
      workflow: {
        needsOnboarding,
      },
    };
  }
}

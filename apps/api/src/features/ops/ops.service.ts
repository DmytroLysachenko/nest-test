import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, eq, gte, isNull, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';
import type { Env } from '@/config/env';

@Injectable()
export class OpsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async getMetrics() {
    const windowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const [activeRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(inArray(jobSourceRunsTable.status, ['PENDING', 'RUNNING']));
    const [pendingRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.status, 'PENDING'));
    const [runningRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.status, 'RUNNING'));

    const [totalRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(gte(jobSourceRunsTable.createdAt, cutoff));
    const [completedRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'COMPLETED'), gte(jobSourceRunsTable.createdAt, cutoff)));
    const [failedRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'FAILED'), gte(jobSourceRunsTable.createdAt, cutoff)));

    const [totalUserOffersRow] = await this.db.select({ value: count() }).from(userJobOffersTable);
    const [unscoredUserOffersRow] = await this.db
      .select({ value: count() })
      .from(userJobOffersTable)
      .where(isNull(userJobOffersTable.matchScore));

    const totalRuns = Number(totalRunsRow?.value ?? 0);
    const completedRuns = Number(completedRunsRow?.value ?? 0);

    return {
      windowHours,
      queue: {
        activeRuns: Number(activeRunsRow?.value ?? 0),
        pendingRuns: Number(pendingRunsRow?.value ?? 0),
        runningRuns: Number(runningRunsRow?.value ?? 0),
      },
      scrape: {
        totalRuns,
        completedRuns,
        failedRuns: Number(failedRunsRow?.value ?? 0),
        successRate: totalRuns ? Number((completedRuns / totalRuns).toFixed(4)) : 0,
      },
      offers: {
        totalUserOffers: Number(totalUserOffersRow?.value ?? 0),
        unscoredUserOffers: Number(unscoredUserOffersRow?.value ?? 0),
      },
    };
  }
}

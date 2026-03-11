import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Drizzle } from '@/common/decorators';

const REQUIRED_TABLES = ['api_request_events'] as const;

@Injectable()
export class RequiredTablesHealthIndicator {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    const missingTables = await this.findMissingTables();

    if (!missingTables.length) {
      return indicator.up({ requiredTables: REQUIRED_TABLES });
    }

    return indicator.down({
      missingTables,
      requiredTables: REQUIRED_TABLES,
      resolution: 'Run pnpm --filter @repo/db migrate against the active database/branch.',
    });
  }

  async findMissingTables() {
    const checks = await Promise.all(
      REQUIRED_TABLES.map(async (tableName) => {
        const result = await this.db.execute<{ relation: string | null }>(
          sql`select to_regclass(${`public.${tableName}`}) as relation`,
        );
        const row = result.rows[0];
        return row?.relation ? null : tableName;
      }),
    );

    return checks.filter((value): value is (typeof REQUIRED_TABLES)[number] => value !== null);
  }
}

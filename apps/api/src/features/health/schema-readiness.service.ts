import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from '@/config/env';

import { RequiredTablesHealthIndicator } from './required-tables.health-indicator';

@Injectable()
export class SchemaReadinessService implements OnModuleInit {
  private readonly logger = new Logger(SchemaReadinessService.name);

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly requiredTablesHealthIndicator: RequiredTablesHealthIndicator,
  ) {}

  async onModuleInit() {
    const missingTables = await this.requiredTablesHealthIndicator.findMissingTables();
    if (!missingTables.length) {
      return;
    }

    const message =
      `Missing required database tables: ${missingTables.join(', ')}. ` +
      'Run pnpm --filter @repo/db migrate against the active database/branch.';

    if (this.configService.get('NODE_ENV', { infer: true }) === 'production') {
      throw new Error(message);
    }

    this.logger.warn(message);
  }
}

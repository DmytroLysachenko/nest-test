import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';
import { RequiredTablesHealthIndicator } from './required-tables.health-indicator';
import { SchemaReadinessService } from './schema-readiness.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService, DrizzleHealthIndicator, RequiredTablesHealthIndicator, SchemaReadinessService],
})
export class HealthModule {}

import { platform } from 'os';

import { Injectable } from '@nestjs/common';
import { DiskHealthIndicator, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

import { DrizzleHealthIndicator } from './drizzle-health.indicator';
import { RequiredTablesHealthIndicator } from './required-tables.health-indicator';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private config: ConfigService,
    private databaseHealth: DrizzleHealthIndicator,
    private requiredTablesHealth: RequiredTablesHealthIndicator,
  ) {}

  async check() {
    const diskPath = platform() === 'win32' ? `${process.env.SystemDrive ?? 'C:'}\\` : '/';
    const thresholdPercent = this.config.get<number>('DISK_HEALTH_THRESHOLD') ?? 0.98;
    return await this.health.check([
      async () => this.databaseHealth.isHealthy('drizzle'),
      async () => this.requiredTablesHealth.isHealthy('required_tables'),
      async () => this.memory.checkRSS('memory_rss', 3000 * 1024 * 1024),
      async () =>
        this.disk.checkStorage('disk health', {
          thresholdPercent,
          path: diskPath,
        }),
    ]);
  }
}

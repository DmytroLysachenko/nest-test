import { Injectable } from '@nestjs/common';
import { Schema } from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DiskHealthIndicator, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { platform } from 'os';

import { DrizzleHealthIndicator } from './drizzle-health.indicator';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private config: ConfigService,
    private databaseHealth: DrizzleHealthIndicator,
  ) {}

  async check() {
    const diskPath = platform() === 'win32' ? `${process.env.SystemDrive ?? 'C:'}\\` : '/';
    const thresholdPercent = this.config.get<number>('DISK_HEALTH_THRESHOLD') ?? 0.98;
    return await this.health.check([
      async () => this.databaseHealth.isHealthy('drizzle'),
      async () => this.memory.checkRSS('memory_rss', 3000 * 1024 * 1024),
      async () =>
        this.disk.checkStorage('disk health', {
          thresholdPercent,
          path: diskPath,
        }),
    ]);
  }
}

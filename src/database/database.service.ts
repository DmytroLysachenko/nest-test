import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg, { PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly pool: pg.Pool;
  public readonly db: NodePgDatabase<typeof schema>;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const databaseUrl =
      this.configService.get<string>('DATABASE_URL') ??
      (nodeEnv === 'production'
        ? this.configService.get<string>('DATABASE_URL_NEON')
        : this.configService.get<string>('DATABASE_URL_LOCAL'));

    if (!databaseUrl) {
      throw new Error(
        'Database connection string is not configured (DATABASE_URL, DATABASE_URL_LOCAL, or DATABASE_URL_NEON).',
      );
    }

    const poolConfig: PoolConfig = {
      connectionString: databaseUrl,
      ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    };

    this.pool = new pg.Pool(poolConfig);
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

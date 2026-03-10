import { Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { apiRequestEventsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

type CreateApiRequestEventInput = {
  userId?: string | null;
  requestId?: string | null;
  level: 'warning' | 'error';
  method: string;
  path: string;
  statusCode: number;
  message: string;
  errorCode?: string | null;
  details?: string[];
  meta?: Record<string, unknown>;
};

@Injectable()
export class ApiRequestEventsService {
  private readonly logger = new Logger(ApiRequestEventsService.name);

  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async create(input: CreateApiRequestEventInput) {
    try {
      await this.db.insert(apiRequestEventsTable).values({
        userId: input.userId ?? null,
        requestId: input.requestId ?? null,
        level: input.level,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        message: input.message,
        errorCode: input.errorCode ?? null,
        details: input.details?.length ? input.details : null,
        meta: input.meta ?? null,
      });
    } catch (error) {
      this.logger.error({ error, requestId: input.requestId, path: input.path }, 'Failed to persist API request event');
    }
  }
}

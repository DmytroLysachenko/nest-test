import { Injectable, Logger } from '@nestjs/common';
import { authorizationEventsTable } from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Drizzle } from '@/common/decorators';

type AuthorizationEventInput = {
  userId?: string | null;
  role?: string | null;
  permission?: string | null;
  resource?: string | null;
  action: 'allow' | 'deny';
  outcome: 'success' | 'forbidden';
  requestId?: string | null;
  method?: string | null;
  path?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown> | null;
};

@Injectable()
export class AuthorizationEventsService {
  private readonly logger = new Logger(AuthorizationEventsService.name);

  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async create(input: AuthorizationEventInput) {
    try {
      await this.db.insert(authorizationEventsTable).values({
        userId: input.userId ?? null,
        role: input.role ?? null,
        permission: input.permission ?? null,
        resource: input.resource ?? null,
        action: input.action,
        outcome: input.outcome,
        requestId: input.requestId ?? null,
        method: input.method ?? null,
        path: input.path ?? null,
        reason: input.reason ?? null,
        meta: input.meta ?? null,
      });
    } catch (error) {
      this.logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          permission: input.permission,
          path: input.path,
        },
        'Failed to persist authorization event',
      );
    }
  }
}

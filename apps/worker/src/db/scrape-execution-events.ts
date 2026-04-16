import { scrapeExecutionEventsTable } from '@repo/db';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';

import { getDb } from './client';

type ScrapeExecutionEventInput = {
  sourceRunId?: string;
  traceId?: string;
  requestId?: string;
  taskId?: string;
  dedupeKey?: string;
  leaseExpiresAt?: Date;
  executionStatus?: string;
  stage: string;
  status: 'info' | 'success' | 'warning' | 'failed';
  code?: string | null;
  message: string;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};

const toNullableRecord = (value: Record<string, unknown> | null | undefined) => {
  if (!value) {
    return null;
  }

  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
};

export const appendScrapeExecutionEvent = async (databaseUrl: string | undefined, input: ScrapeExecutionEventInput) => {
  if (!input.sourceRunId) {
    return;
  }

  const db = getDb(databaseUrl);
  if (!db) {
    return;
  }

  await db.insert(scrapeExecutionEventsTable).values({
    sourceRunId: input.sourceRunId,
    traceId: input.traceId ?? null,
    requestId: input.requestId ?? null,
    taskId: input.taskId ?? null,
    dedupeKey: input.dedupeKey ?? null,
    leaseExpiresAt: input.leaseExpiresAt ?? null,
    executionStatus: input.executionStatus ?? null,
    stage: input.stage,
    status: input.status,
    code: input.code ?? null,
    message: input.message,
    meta: toNullableRecord(input.meta),
    createdAt: input.createdAt ?? new Date(),
  });
};

export const findActiveScrapeExecutionLease = async (
  databaseUrl: string | undefined,
  input: {
    sourceRunId?: string;
    now?: Date;
  },
) => {
  if (!input.sourceRunId) {
    return null;
  }

  const db = getDb(databaseUrl);
  if (!db) {
    return null;
  }

  const [latestLeaseEvent] = await db
    .select({
      taskId: scrapeExecutionEventsTable.taskId,
      dedupeKey: scrapeExecutionEventsTable.dedupeKey,
      leaseExpiresAt: scrapeExecutionEventsTable.leaseExpiresAt,
      executionStatus: scrapeExecutionEventsTable.executionStatus,
      createdAt: scrapeExecutionEventsTable.createdAt,
    })
    .from(scrapeExecutionEventsTable)
    .where(
      and(
        eq(scrapeExecutionEventsTable.sourceRunId, input.sourceRunId),
        inArray(scrapeExecutionEventsTable.executionStatus, ['accepted', 'started', 'completed', 'failed']),
        gt(scrapeExecutionEventsTable.leaseExpiresAt, input.now ?? new Date()),
      ),
    )
    .orderBy(desc(scrapeExecutionEventsTable.createdAt))
    .limit(1);

  if (!latestLeaseEvent || !latestLeaseEvent.executionStatus) {
    return null;
  }

  return ['accepted', 'started'].includes(latestLeaseEvent.executionStatus) ? latestLeaseEvent : null;
};

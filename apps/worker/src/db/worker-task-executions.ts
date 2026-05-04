import { workerTaskExecutionsTable } from '@repo/db';
import { and, eq, inArray, lte, or, sql } from 'drizzle-orm';

import { getDb } from './client';

type WorkerTaskExecutionStatus = 'accepted' | 'started' | 'completed' | 'failed' | 'timed_out';

type WorkerTaskExecutionInput = {
  sourceRunId?: string;
  taskId?: string;
  traceId?: string;
  requestId?: string;
  dedupeKey?: string;
  queueProvider?: string;
  leaseExpiresAt?: Date;
  meta?: Record<string, unknown> | null;
  now?: Date;
};

type WorkerTaskExecutionUpdateInput = {
  sourceRunId?: string;
  status: WorkerTaskExecutionStatus;
  error?: string | null;
  leaseExpiresAt?: Date | null;
  meta?: Record<string, unknown> | null;
  now?: Date;
};

const toNullableRecord = (value: Record<string, unknown> | null | undefined) => {
  if (!value) {
    return null;
  }

  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
};

export const claimWorkerTaskExecution = async (databaseUrl: string | undefined, input: WorkerTaskExecutionInput) => {
  if (!input.sourceRunId || !input.taskId) {
    return { outcome: 'skipped' as const };
  }

  const db = getDb(databaseUrl);
  if (!db) {
    return { outcome: 'skipped' as const };
  }

  const now = input.now ?? new Date();
  const terminalStatuses: WorkerTaskExecutionStatus[] = ['completed', 'failed', 'timed_out'];

  const [claimed] = await db
    .insert(workerTaskExecutionsTable)
    .values({
      sourceRunId: input.sourceRunId,
      taskId: input.taskId,
      traceId: input.traceId ?? null,
      requestId: input.requestId ?? null,
      dedupeKey: input.dedupeKey ?? null,
      queueProvider: input.queueProvider ?? null,
      status: 'accepted',
      acceptedAt: now,
      startedAt: null,
      completedAt: null,
      leaseExpiresAt: input.leaseExpiresAt ?? null,
      error: null,
      meta: toNullableRecord(input.meta),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workerTaskExecutionsTable.sourceRunId,
      set: {
        taskId: input.taskId,
        traceId: input.traceId ?? null,
        requestId: input.requestId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        queueProvider: input.queueProvider ?? null,
        status: 'accepted',
        acceptedAt: now,
        startedAt: null,
        completedAt: null,
        leaseExpiresAt: input.leaseExpiresAt ?? null,
        error: null,
        meta: toNullableRecord(input.meta),
        updatedAt: now,
      },
      targetWhere: sql`${workerTaskExecutionsTable.sourceRunId} IS NOT NULL`,
      setWhere: or(
        lte(workerTaskExecutionsTable.leaseExpiresAt, now),
        inArray(workerTaskExecutionsTable.status, terminalStatuses),
      ),
    })
    .returning({
      taskId: workerTaskExecutionsTable.taskId,
      leaseExpiresAt: workerTaskExecutionsTable.leaseExpiresAt,
      status: workerTaskExecutionsTable.status,
    });

  if (claimed) {
    return { outcome: 'claimed' as const, execution: claimed };
  }

  const [existing] = await db
    .select({
      taskId: workerTaskExecutionsTable.taskId,
      leaseExpiresAt: workerTaskExecutionsTable.leaseExpiresAt,
      status: workerTaskExecutionsTable.status,
    })
    .from(workerTaskExecutionsTable)
    .where(eq(workerTaskExecutionsTable.sourceRunId, input.sourceRunId))
    .limit(1);

  return { outcome: 'duplicate' as const, execution: existing ?? null };
};

export const updateWorkerTaskExecution = async (
  databaseUrl: string | undefined,
  input: WorkerTaskExecutionUpdateInput,
) => {
  if (!input.sourceRunId) {
    return;
  }

  const db = getDb(databaseUrl);
  if (!db) {
    return;
  }

  const now = input.now ?? new Date();
  const isTerminal = ['completed', 'failed', 'timed_out'].includes(input.status);

  await db
    .update(workerTaskExecutionsTable)
    .set({
      status: input.status,
      startedAt: input.status === 'started' ? now : undefined,
      completedAt: isTerminal ? now : undefined,
      leaseExpiresAt: input.leaseExpiresAt === undefined ? undefined : input.leaseExpiresAt,
      error: input.error === undefined ? undefined : input.error,
      meta: input.meta === undefined ? undefined : toNullableRecord(input.meta),
      updatedAt: now,
    })
    .where(
      and(
        eq(workerTaskExecutionsTable.sourceRunId, input.sourceRunId),
        inArray(workerTaskExecutionsTable.status, ['accepted', 'started', 'completed', 'failed', 'timed_out']),
      ),
    );
};

import { scrapeExecutionEventsTable } from '@repo/db';

import { getDb } from './client';

type ScrapeExecutionEventInput = {
  sourceRunId?: string;
  traceId?: string;
  requestId?: string;
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
    stage: input.stage,
    status: input.status,
    code: input.code ?? null,
    message: input.message,
    meta: toNullableRecord(input.meta),
    createdAt: input.createdAt ?? new Date(),
  });
};

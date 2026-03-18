import { createHmac } from 'crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

import { resolveOutboundAuthorizationHeader } from './oidc-auth';
import { appendScrapeExecutionEvent } from '../db/scrape-execution-events';

import type { Logger } from 'pino';

type DeadLetterPayload = {
  callbackUrl: string;
  callbackToken?: string;
  requestId?: string;
  payload: Record<string, unknown>;
  reason: string;
  createdAt: string;
};

const buildSignaturePayload = (entry: DeadLetterPayload, timestampSec: number) => {
  const sourceRunId = typeof entry.payload.sourceRunId === 'string' ? entry.payload.sourceRunId : '';
  const status = typeof entry.payload.status === 'string' ? entry.payload.status : '';
  const runId = typeof entry.payload.runId === 'string' ? entry.payload.runId : '';
  const eventId = typeof entry.payload.eventId === 'string' ? entry.payload.eventId : '';
  return `${timestampSec}.${sourceRunId}.${status}.${runId}.${entry.requestId ?? ''}.${eventId}`;
};

const toSafeFilename = (value: string) => value.replace(/[^\w.-]+/g, '_');

const resolveDeadLetterDir = (value?: string) => {
  if (!value) {
    return resolve(process.cwd(), 'data', 'dead-letter');
  }
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const toNullableString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const appendReplayAuditEvent = async (
  databaseUrl: string | undefined,
  entry: DeadLetterPayload,
  input: {
    stage: string;
    status: 'info' | 'success' | 'warning' | 'failed';
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  },
  logger: Logger,
) => {
  const sourceRunId = toNullableString(entry.payload.sourceRunId);
  if (!sourceRunId) {
    return;
  }

  await appendScrapeExecutionEvent(databaseUrl, {
    sourceRunId,
    traceId: toNullableString(entry.payload.traceId) ?? undefined,
    requestId: entry.requestId,
    stage: input.stage,
    status: input.status,
    code: input.code,
    message: input.message,
    meta: input.meta ?? null,
  }).catch((error) => {
    logger.warn(
      {
        sourceRunId,
        stage: input.stage,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to persist dead-letter replay audit event',
    );
  });
};

export const persistDeadLetter = async (
  entry: DeadLetterPayload,
  deadLetterDir: string | undefined,
  logger: Logger,
) => {
  const dir = resolveDeadLetterDir(deadLetterDir);
  await mkdir(dir, { recursive: true });
  const runId = typeof entry.payload.runId === 'string' ? entry.payload.runId : 'run';
  const sourceRunId = typeof entry.payload.sourceRunId === 'string' ? entry.payload.sourceRunId : 'no-source-run-id';
  const filename = `${toSafeFilename(runId)}-${toSafeFilename(sourceRunId)}-${Date.now()}.json`;
  const path = join(dir, filename);
  await writeFile(path, JSON.stringify(entry, null, 2), 'utf-8');
  logger.error({ path, requestId: entry.requestId }, 'Callback moved to dead letter');
};

export const replayDeadLetters = async (
  deadLetterDir: string | undefined,
  logger: Logger,
  callbackSigningSecret?: string,
  callbackOidcAudience?: string,
  databaseUrl?: string,
) => {
  const dir = resolveDeadLetterDir(deadLetterDir);
  const filenames = await readdir(dir).catch(() => []);
  const results = {
    total: filenames.length,
    sent: 0,
    failed: 0,
  };

  for (const filename of filenames) {
    const path = join(dir, filename);
    try {
      const raw = await readFile(path, 'utf-8');
      const entry = JSON.parse(raw) as DeadLetterPayload;
      await appendReplayAuditEvent(
        databaseUrl,
        entry,
        {
          stage: 'callback_replay',
          status: 'info',
          code: 'CALLBACK_REPLAY_ATTEMPTED',
          message: 'Dead-letter callback replay attempt started',
          meta: {
            filename,
            callbackUrl: entry.callbackUrl,
          },
        },
        logger,
      );
      const timestampSec = Math.floor(Date.now() / 1000);
      const signature = callbackSigningSecret
        ? createHmac('sha256', callbackSigningSecret).update(buildSignaturePayload(entry, timestampSec)).digest('hex')
        : null;
      const authorization = await resolveOutboundAuthorizationHeader(entry.callbackToken, callbackOidcAudience);
      const response = await fetch(entry.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(entry.requestId ? { 'x-request-id': entry.requestId } : {}),
          ...(authorization ? { Authorization: authorization } : {}),
          ...(signature ? { 'x-worker-signature': signature, 'x-worker-timestamp': String(timestampSec) } : {}),
        },
        body: JSON.stringify(entry.payload),
      });
      if (!response.ok) {
        const body = await response.text();
        await appendReplayAuditEvent(
          databaseUrl,
          entry,
          {
            stage: 'callback_replay',
            status: 'warning',
            code: 'CALLBACK_REPLAY_REJECTED',
            message: 'Dead-letter callback replay was rejected',
            meta: {
              filename,
              statusCode: response.status,
              body,
            },
          },
          logger,
        );
        logger.warn({ filename, status: response.status, body }, 'Dead-letter callback replay rejected');
        results.failed += 1;
        continue;
      }
      await rm(path);
      results.sent += 1;
      await appendReplayAuditEvent(
        databaseUrl,
        entry,
        {
          stage: 'callback_replay',
          status: 'success',
          code: 'CALLBACK_REPLAY_ACCEPTED',
          message: 'Dead-letter callback replay accepted',
          meta: {
            filename,
            statusCode: response.status,
          },
        },
        logger,
      );
      logger.info({ filename }, 'Dead-letter callback replayed');
    } catch (error) {
      let entry: DeadLetterPayload | null = null;
      try {
        const raw = await readFile(path, 'utf-8');
        entry = JSON.parse(raw) as DeadLetterPayload;
      } catch {
        entry = null;
      }
      if (entry) {
        await appendReplayAuditEvent(
          databaseUrl,
          entry,
          {
            stage: 'callback_replay',
            status: 'failed',
            code: 'CALLBACK_REPLAY_FAILED',
            message: 'Dead-letter callback replay failed',
            meta: {
              filename,
              error: error instanceof Error ? error.message : String(error),
            },
          },
          logger,
        );
      }
      logger.warn({ filename, error }, 'Dead-letter callback replay failed');
      results.failed += 1;
    }
  }

  return results;
};

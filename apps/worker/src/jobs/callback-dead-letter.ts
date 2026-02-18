import { createHmac } from 'crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

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
      const timestampSec = Math.floor(Date.now() / 1000);
      const signature = callbackSigningSecret
        ? createHmac('sha256', callbackSigningSecret).update(buildSignaturePayload(entry, timestampSec)).digest('hex')
        : null;
      const response = await fetch(entry.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(entry.requestId ? { 'x-request-id': entry.requestId } : {}),
          ...(entry.callbackToken ? { Authorization: `Bearer ${entry.callbackToken}` } : {}),
          ...(signature ? { 'x-worker-signature': signature, 'x-worker-timestamp': String(timestampSec) } : {}),
        },
        body: JSON.stringify(entry.payload),
      });
      if (!response.ok) {
        const body = await response.text();
        logger.warn({ filename, status: response.status, body }, 'Dead-letter callback replay rejected');
        results.failed += 1;
        continue;
      }
      await rm(path);
      results.sent += 1;
      logger.info({ filename }, 'Dead-letter callback replayed');
    } catch (error) {
      logger.warn({ filename, error }, 'Dead-letter callback replay failed');
      results.failed += 1;
    }
  }

  return results;
};

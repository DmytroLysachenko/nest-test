import { randomUUID } from 'crypto';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

import type { Logger } from 'pino';

import type { WorkerEnv } from '../config/env';
import { TaskRunner } from '../queue/task-runner';
import { taskEnvelopeSchema } from '../queue/task-types';
import type { TaskEnvelope } from '../queue/task-types';
import type { ScrapeSourceJob } from '../types/jobs';

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

const sendJson = (res: ServerResponse, status: number, payload: Record<string, unknown>) => {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
};

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
};

const verifyAuth = (req: IncomingMessage, env: WorkerEnv) => {
  if (!env.TASKS_AUTH_TOKEN) {
    return true;
  }
  const header = req.headers.authorization;
  return header === `Bearer ${env.TASKS_AUTH_TOKEN}`;
};

const scrapePayloadSchema = taskEnvelopeSchema.shape.payload;

const parseTask = (body: unknown): TaskEnvelope | null => {
  const envelopeResult = taskEnvelopeSchema.safeParse(body);
  if (envelopeResult.success) {
    return envelopeResult.data as TaskEnvelope;
  }

  const payloadResult = scrapePayloadSchema.safeParse(body);
  if (!payloadResult.success) {
    return null;
  }

  return {
    name: 'scrape:source',
    payload: payloadResult.data as ScrapeSourceJob,
  };
};

const resolveRequestId = (req: IncomingMessage) => {
  const header = req.headers['x-request-id'];
  if (Array.isArray(header)) {
    return header[0] || randomUUID();
  }
  return header || randomUUID();
};

export const createTaskServer = (env: WorkerEnv, logger: Logger) => {
  const runner = new TaskRunner(
    logger,
    {
      headless: env.PLAYWRIGHT_HEADLESS,
      outputDir: env.WORKER_OUTPUT_DIR,
      listingDelayMs: env.PRACUJ_LISTING_DELAY_MS,
      listingCooldownMs: env.PRACUJ_LISTING_COOLDOWN_MS,
      detailDelayMs: env.PRACUJ_DETAIL_DELAY_MS,
      detailCacheHours: env.PRACUJ_DETAIL_CACHE_HOURS,
      listingOnly: env.PRACUJ_LISTING_ONLY,
      detailHost: env.PRACUJ_DETAIL_HOST,
      detailCookiesPath: env.PRACUJ_DETAIL_COOKIES_PATH,
      detailHumanize: env.PRACUJ_DETAIL_HUMANIZE,
      requireDetail: env.PRACUJ_REQUIRE_DETAIL,
      profileDir: env.PRACUJ_PROFILE_DIR,
      outputMode: env.WORKER_OUTPUT_MODE,
      callbackUrl: env.WORKER_CALLBACK_URL,
      callbackToken: env.WORKER_CALLBACK_TOKEN,
      callbackRetryAttempts: env.WORKER_CALLBACK_RETRY_ATTEMPTS,
      callbackRetryBackoffMs: env.WORKER_CALLBACK_RETRY_BACKOFF_MS,
      callbackDeadLetterDir: env.WORKER_DEAD_LETTER_DIR,
    },
    env.WORKER_MAX_CONCURRENT_TASKS,
  );

  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, queue: runner.getStats() });
      return;
    }

    if (req.method !== 'POST' || (req.url !== '/tasks' && req.url !== '/scrape')) {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    if (!verifyAuth(req, env)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const requestId = resolveRequestId(req);
    res.setHeader('x-request-id', requestId);

    try {
      const body = await readJsonBody(req);
      const task = parseTask(body);
      if (!task) {
        sendJson(res, 400, { error: 'Invalid task payload' });
        return;
      }

      if (!task.payload.requestId) {
        task.payload.requestId = requestId;
      }

      logger.info(
        {
          requestId,
          taskName: task.name,
          runId: task.payload.runId ?? null,
          sourceRunId: task.payload.sourceRunId ?? null,
        },
        'Task received',
      );

      runner.enqueue(task);
      sendJson(res, 202, {
        ok: true,
        status: 'accepted',
        requestId,
        runId: task.payload.runId ?? null,
        sourceRunId: task.payload.sourceRunId ?? null,
      });
    } catch (error) {
      logger.error({ requestId, error: formatError(error) }, 'Task processing failed');
      sendJson(res, 500, { error: 'Task processing failed', requestId });
    }
  });
};

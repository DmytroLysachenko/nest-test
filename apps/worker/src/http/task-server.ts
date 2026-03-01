import { randomUUID } from 'crypto';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

import { OAuth2Client } from 'google-auth-library';
import type { Logger } from 'pino';

import type { WorkerEnv } from '../config/env';
import { replayDeadLetters } from '../jobs/callback-dead-letter';
import { TaskRunner } from '../queue/task-runner';
import { taskEnvelopeSchema } from '../queue/task-types';
import type { TaskEnvelope } from '../queue/task-types';
import type { ScrapeSourceJob } from '../types/jobs';

const readJsonBody = async (req: IncomingMessage, maxBytes: number): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      const chunkSize = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
      size += chunkSize;
      if (size > maxBytes) {
        reject(new Error(`Request body too large (max ${maxBytes} bytes)`));
        req.destroy();
        return;
      }
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

const oidcClient = new OAuth2Client();

const verifyAuth = async (req: IncomingMessage, env: WorkerEnv, logger: Logger) => {
  const header = req.headers.authorization;
  if (!header) {
    return false;
  }
  if (env.TASKS_AUTH_TOKEN && header === `Bearer ${env.TASKS_AUTH_TOKEN}`) {
    return true;
  }

  if (env.QUEUE_PROVIDER !== 'cloud-tasks' || !header.startsWith('Bearer ')) {
    return false;
  }

  const idToken = header.slice('Bearer '.length).trim();
  if (!idToken) {
    return false;
  }

  try {
    const audience = env.TASKS_OIDC_AUDIENCE ?? env.TASKS_URL;
    const ticket = await oidcClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return false;
    }
    if (env.TASKS_SERVICE_ACCOUNT_EMAIL && payload.email !== env.TASKS_SERVICE_ACCOUNT_EMAIL) {
      logger.warn(
        { expected: env.TASKS_SERVICE_ACCOUNT_EMAIL, actual: payload.email ?? null },
        'Rejected task request with unexpected OIDC service account',
      );
      return false;
    }
    return true;
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      'Rejected task request with invalid OIDC token',
    );
    return false;
  }
};

const scrapePayloadSchema = taskEnvelopeSchema.shape.payload;

const parseTask = (body: unknown): { task: TaskEnvelope | null; error?: string } => {
  const envelopeResult = taskEnvelopeSchema.safeParse(body);
  if (envelopeResult.success) {
    return { task: envelopeResult.data as TaskEnvelope };
  }

  const payloadResult = scrapePayloadSchema.safeParse(body);
  if (!payloadResult.success) {
    const issues = [...envelopeResult.error.issues, ...payloadResult.error.issues]
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return { task: null, error: issues || 'Invalid payload' };
  }

  return {
    task: {
      name: 'scrape:source',
      payload: payloadResult.data as ScrapeSourceJob,
    },
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
      callbackOidcAudience: env.WORKER_CALLBACK_OIDC_AUDIENCE,
      callbackSigningSecret: env.WORKER_CALLBACK_SIGNING_SECRET,
      callbackRetryAttempts: env.WORKER_CALLBACK_RETRY_ATTEMPTS,
      callbackRetryBackoffMs: env.WORKER_CALLBACK_RETRY_BACKOFF_MS,
      callbackRetryMaxDelayMs: env.WORKER_CALLBACK_RETRY_MAX_DELAY_MS,
      callbackRetryJitterPct: env.WORKER_CALLBACK_RETRY_JITTER_PCT,
      heartbeatIntervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      callbackDeadLetterDir: env.WORKER_DEAD_LETTER_DIR,
      scrapeTimeoutMs: env.WORKER_TASK_TIMEOUT_MS,
      databaseUrl: env.DATABASE_URL,
    },
    env.WORKER_MAX_CONCURRENT_TASKS,
    env.WORKER_MAX_QUEUE_SIZE,
    env.WORKER_TASK_TIMEOUT_MS,
  );

  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, queue: runner.getStats() });
      return;
    }

    if (req.method !== 'POST' || (req.url !== '/tasks' && req.url !== '/scrape')) {
      if (req.method === 'POST' && req.url === '/callbacks/replay') {
        if (!(await verifyAuth(req, env, logger))) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        try {
          const result = await replayDeadLetters(
            env.WORKER_DEAD_LETTER_DIR,
            logger,
            env.WORKER_CALLBACK_SIGNING_SECRET,
            env.WORKER_CALLBACK_OIDC_AUDIENCE,
          );
          sendJson(res, 200, { ok: true, ...result });
        } catch (error) {
          logger.error({ error: formatError(error) }, 'Dead-letter callback replay failed');
          sendJson(res, 500, { error: 'Dead-letter callback replay failed' });
        }
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    if (!(await verifyAuth(req, env, logger))) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const requestId = resolveRequestId(req);
    res.setHeader('x-request-id', requestId);

    try {
      const body = await readJsonBody(req, env.WORKER_MAX_BODY_BYTES);
      const parsed = parseTask(body);
      if (!parsed.task) {
        sendJson(res, 400, { error: 'Invalid task payload', details: parsed.error, requestId });
        return;
      }
      const task = parsed.task;

      if (!task.payload.requestId) {
        task.payload.requestId = requestId;
      }

      logger.info(
        {
          queueProvider: env.QUEUE_PROVIDER,
          requestId,
          taskName: task.name,
          runId: task.payload.runId ?? null,
          sourceRunId: task.payload.sourceRunId ?? null,
        },
        'Task received',
      );

      const accepted = runner.enqueue(task);
      if (!accepted) {
        sendJson(res, 429, {
          ok: false,
          status: 'rejected',
          reason: 'Queue is full',
          queueProvider: env.QUEUE_PROVIDER,
          requestId,
          queue: runner.getStats(),
        });
        return;
      }

      sendJson(res, 202, {
        ok: true,
        status: 'accepted',
        queueProvider: env.QUEUE_PROVIDER,
        requestId,
        runId: task.payload.runId ?? null,
        sourceRunId: task.payload.sourceRunId ?? null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Request body too large')) {
        sendJson(res, 413, { error: error.message, requestId });
        return;
      }
      logger.error({ requestId, error: formatError(error) }, 'Task processing failed');
      sendJson(res, 500, { error: 'Task processing failed', requestId });
    }
  });
};

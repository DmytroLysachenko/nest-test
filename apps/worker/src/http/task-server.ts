import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

import type { Logger } from 'pino';

import type { WorkerEnv } from '../config/env';
import { handleTask } from '../queue/task-handler';
import type { TaskEnvelope } from '../queue/task-types';
import { taskEnvelopeSchema } from '../queue/task-types';

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

const verifyAuth = (req: IncomingMessage, env: WorkerEnv) => {
  if (!env.TASKS_AUTH_TOKEN) {
    return true;
  }
  const header = req.headers.authorization;
  return header === `Bearer ${env.TASKS_AUTH_TOKEN}`;
};

export const createTaskServer = (env: WorkerEnv, logger: Logger) => {
  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/tasks') {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    if (!verifyAuth(req, env)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const parsed = taskEnvelopeSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid task payload' });
        return;
      }

      const task = parsed.data as TaskEnvelope;
      const requestId = req.headers['x-request-id'];
      logger.info({ requestId, taskName: task.name, runId: task.payload.runId ?? null }, 'Task received');

      const result = await handleTask(task, logger, {
        headless: env.PLAYWRIGHT_HEADLESS,
        outputDir: env.WORKER_OUTPUT_DIR,
      });
      sendJson(res, 200, { ok: true, result });
    } catch (error) {
      logger.error({ error }, 'Task processing failed');
      sendJson(res, 500, { error: 'Task processing failed' });
    }
  });
};

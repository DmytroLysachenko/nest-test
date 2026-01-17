import { CloudTasksClient } from '@google-cloud/tasks';
import { Logger } from 'pino';

import { WorkerEnv } from '../config/env';

import { TaskEnvelope } from './task-types';

type CloudTasksConfig = {
  projectId: string;
  location: string;
  queue: string;
  targetUrl: string;
  authToken?: string;
  serviceAccountEmail?: string;
};

const resolveCloudTasksConfig = (env: WorkerEnv): CloudTasksConfig => {
  if (!env.TASKS_PROJECT_ID || !env.TASKS_LOCATION || !env.TASKS_QUEUE || !env.TASKS_URL) {
    throw new Error('Cloud Tasks config is missing (TASKS_PROJECT_ID, TASKS_LOCATION, TASKS_QUEUE, TASKS_URL)');
  }

  return {
    projectId: env.TASKS_PROJECT_ID,
    location: env.TASKS_LOCATION,
    queue: env.TASKS_QUEUE,
    targetUrl: env.TASKS_URL,
    authToken: env.TASKS_AUTH_TOKEN,
    serviceAccountEmail: env.TASKS_SERVICE_ACCOUNT_EMAIL,
  };
};

export const enqueueCloudTask = async (task: TaskEnvelope, env: WorkerEnv, logger: Logger) => {
  const config = resolveCloudTasksConfig(env);
  const client = new CloudTasksClient();
  const parent = client.queuePath(config.projectId, config.location, config.queue);

  const body = Buffer.from(JSON.stringify(task)).toString('base64');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  const request: Parameters<CloudTasksClient['createTask']>[0] = {
    parent,
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: config.targetUrl,
        headers,
        body,
        oidcToken: config.serviceAccountEmail
          ? {
              serviceAccountEmail: config.serviceAccountEmail,
            }
          : undefined,
      },
    },
  };

  const [response] = await client.createTask(request);
  logger.info({ taskName: response.name }, 'Cloud Task enqueued');
  return response;
};

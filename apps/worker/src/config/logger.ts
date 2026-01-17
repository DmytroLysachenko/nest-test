import pino from 'pino';

import type { WorkerEnv } from './env';

export const createLogger = (env: WorkerEnv) => {
  const transport =
    env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        };

  return pino({
    level: env.WORKER_LOG_LEVEL,
    transport,
  });
};

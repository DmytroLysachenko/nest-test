import { loadEnv } from '../config/env';
import { createLogger } from '../config/logger';

import { replayDeadLetters } from './callback-dead-letter';

const env = loadEnv();
const logger = createLogger(env);

const run = async () => {
  const result = await replayDeadLetters(env.WORKER_DEAD_LETTER_DIR, logger);
  logger.info(result, 'Dead-letter replay finished');
};

run().catch((error) => {
  logger.error({ error }, 'Dead-letter replay failed');
  process.exit(1);
});


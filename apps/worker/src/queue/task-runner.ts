import type { Logger } from 'pino';

import type { TaskEnvelope } from './task-types';
import { handleTask } from './task-handler';

type TaskOptions = Parameters<typeof handleTask>[2];

export class TaskRunner {
  private readonly queue: TaskEnvelope[] = [];
  private active = 0;

  constructor(
    private readonly logger: Logger,
    private readonly options: TaskOptions,
    private readonly maxConcurrent: number,
  ) {}

  enqueue(task: TaskEnvelope) {
    this.queue.push(task);
    this.logger.info(
      { taskName: task.name, runId: task.payload.runId ?? null, queued: this.queue.length },
      'Task queued',
    );
    this.pump();
  }

  private pump() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        return;
      }
      this.active += 1;
      this.run(next)
        .catch((error) => {
          this.logger.error({ error }, 'Task execution failed');
        })
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }

  private async run(task: TaskEnvelope) {
    const start = Date.now();
    const result = await handleTask(task, this.logger, this.options);
    this.logger.info(
      { taskName: task.name, runId: task.payload.runId ?? null, durationMs: Date.now() - start },
      'Task completed',
    );
    return result;
  }
}

import type { Logger } from 'pino';

import { handleTask } from './task-handler';
import type { TaskEnvelope } from './task-types';

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
      { taskName: task.name, runId: task.payload.runId ?? null, sourceRunId: task.payload.sourceRunId ?? null, queued: this.queue.length },
      'Task queued',
    );
    this.pump();
  }

  getStats() {
    return {
      queued: this.queue.length,
      active: this.active,
      maxConcurrent: this.maxConcurrent,
    };
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
      {
        taskName: task.name,
        runId: task.payload.runId ?? null,
        sourceRunId: task.payload.sourceRunId ?? null,
        durationMs: Date.now() - start,
      },
      'Task completed',
    );
    return result;
  }
}

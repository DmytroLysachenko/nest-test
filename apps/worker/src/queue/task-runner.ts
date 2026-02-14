import type { Logger } from 'pino';

import { handleTask } from './task-handler';
import type { TaskEnvelope } from './task-types';

type TaskOptions = Parameters<typeof handleTask>[2];
type QueueItem = {
  task: TaskEnvelope;
  enqueuedAt: number;
};

export class TaskRunner {
  private readonly queue: QueueItem[] = [];
  private active = 0;

  constructor(
    private readonly logger: Logger,
    private readonly options: TaskOptions,
    private readonly maxConcurrent: number,
    private readonly taskTimeoutMs: number,
  ) {}

  enqueue(task: TaskEnvelope) {
    this.queue.push({ task, enqueuedAt: Date.now() });
    this.logger.info(
      {
        taskName: task.name,
        runId: task.payload.runId ?? null,
        sourceRunId: task.payload.sourceRunId ?? null,
        requestId: task.payload.requestId ?? null,
        queued: this.queue.length,
      },
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
      const next = this.queue.shift() as QueueItem | undefined;
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

  private async run(item: QueueItem) {
    const task = item.task;
    const start = Date.now();
    let timeoutRef: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef = setTimeout(() => {
          reject(new Error(`Task timed out after ${this.taskTimeoutMs}ms`));
        }, this.taskTimeoutMs);
        timeoutRef?.unref?.();
      });
      const result = await Promise.race([handleTask(task, this.logger, this.options), timeoutPromise]);
      this.logger.info(
        {
          taskName: task.name,
          runId: task.payload.runId ?? null,
          sourceRunId: task.payload.sourceRunId ?? null,
          requestId: task.payload.requestId ?? null,
          queueWaitMs: start - item.enqueuedAt,
          durationMs: Date.now() - start,
        },
        'Task completed',
      );
      return result;
    } finally {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    }
  }
}

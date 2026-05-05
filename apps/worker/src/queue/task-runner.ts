import { handleTask } from './task-handler';

import type { Logger } from 'pino';
import type { TaskEnvelope } from './task-types';

type TaskOptions = Parameters<typeof handleTask>[2];
type TaskLifecycleStatus = 'started' | 'completed' | 'failed' | 'timed_out';
type QueueItem = {
  task: TaskEnvelope;
  enqueuedAt: number;
  completion?: {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  };
};
type TaskLifecycleHooks = {
  onStateChange?: (task: TaskEnvelope, status: TaskLifecycleStatus, error?: unknown) => Promise<void> | void;
};

export class TaskRunner {
  private readonly queue: QueueItem[] = [];
  private active = 0;

  constructor(
    private readonly logger: Logger,
    private readonly options: TaskOptions,
    private readonly maxConcurrent: number,
    private readonly maxQueueSize: number,
    private readonly taskTimeoutMs: number,
    private readonly hooks: TaskLifecycleHooks = {},
  ) {}

  enqueue(task: TaskEnvelope) {
    return this.enqueueInternal(task);
  }

  enqueueAndWait(task: TaskEnvelope) {
    return new Promise<unknown>((resolve, reject) => {
      const accepted = this.enqueueInternal(task, { resolve, reject });
      if (!accepted) {
        reject(new Error('Queue is full'));
      }
    });
  }

  private enqueueInternal(
    task: TaskEnvelope,
    completion?: {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    },
  ) {
    if (this.queue.length >= this.maxQueueSize) {
      this.logger.warn(
        {
          taskName: task.name,
          runId: task.payload.runId ?? null,
          sourceRunId: task.payload.sourceRunId ?? null,
          requestId: task.payload.requestId ?? null,
          queued: this.queue.length,
          maxQueueSize: this.maxQueueSize,
        },
        'Task rejected because queue is full',
      );
      return false;
    }

    this.queue.push({ task, enqueuedAt: Date.now(), completion });
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
    return true;
  }

  getStats() {
    return {
      queued: this.queue.length,
      active: this.active,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      taskTimeoutMs: this.taskTimeoutMs,
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
        .then((result) => {
          next.completion?.resolve(result);
        })
        .catch((error) => {
          next.completion?.reject(error);
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
    const controller = new AbortController();
    let timeoutRef: NodeJS.Timeout | null = null;
    try {
      await this.hooks.onStateChange?.(task, 'started');
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef = setTimeout(() => {
          controller.abort();
          reject(new Error(`Task timed out after ${this.taskTimeoutMs}ms`));
        }, this.taskTimeoutMs);
        timeoutRef?.unref?.();
      });
      const result = await Promise.race([
        handleTask(task, this.logger, {
          ...this.options,
          abortSignal: controller.signal,
        }),
        timeoutPromise,
      ]);
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
      await this.hooks.onStateChange?.(task, 'completed');
      return result;
    } catch (error) {
      const status =
        error instanceof Error && error.message.startsWith('Task timed out after ') ? 'timed_out' : 'failed';
      await this.hooks.onStateChange?.(task, status, error);
      throw error;
    } finally {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    }
  }
}

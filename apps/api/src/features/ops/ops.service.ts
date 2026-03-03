import { NotFoundException, ServiceUnavailableException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobSourceCallbackEventsTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

import type { Env } from '@/config/env';

@Injectable()
export class OpsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async getMetrics() {
    const windowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const [activeRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(inArray(jobSourceRunsTable.status, ['PENDING', 'RUNNING']));
    const [pendingRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.status, 'PENDING'));
    const [runningRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.status, 'RUNNING'));
    const staleHeartbeatCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const [runningWithoutHeartbeatRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'RUNNING'), isNull(jobSourceRunsTable.lastHeartbeatAt)));
    const [runningStaleHeartbeatRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(
        and(
          eq(jobSourceRunsTable.status, 'RUNNING'),
          isNotNull(jobSourceRunsTable.lastHeartbeatAt),
          lt(jobSourceRunsTable.lastHeartbeatAt, staleHeartbeatCutoff),
        ),
      );

    const [totalRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(gte(jobSourceRunsTable.createdAt, cutoff));
    const [completedRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'COMPLETED'), gte(jobSourceRunsTable.createdAt, cutoff)));
    const [failedRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'FAILED'), gte(jobSourceRunsTable.createdAt, cutoff)));
    const [staleReconciledRunsRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(
        and(
          eq(jobSourceRunsTable.status, 'FAILED'),
          eq(jobSourceRunsTable.failureType, 'timeout'),
          eq(jobSourceRunsTable.error, '[timeout] run stale watchdog'),
          gte(jobSourceRunsTable.createdAt, cutoff),
        ),
      );
    const [retriesTriggeredRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(and(isNotNull(jobSourceRunsTable.retryOfRunId), gte(jobSourceRunsTable.createdAt, cutoff)));
    const [retryCompletedRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(
        and(
          isNotNull(jobSourceRunsTable.retryOfRunId),
          eq(jobSourceRunsTable.status, 'COMPLETED'),
          gte(jobSourceRunsTable.createdAt, cutoff),
        ),
      );

    const [totalUserOffersRow] = await this.db.select({ value: count() }).from(userJobOffersTable);
    const [unscoredUserOffersRow] = await this.db
      .select({ value: count() })
      .from(userJobOffersTable)
      .where(isNull(userJobOffersTable.matchScore));
    const callbackEvents = await this.db
      .select({
        status: jobSourceCallbackEventsTable.status,
        payload: jobSourceCallbackEventsTable.payload,
      })
      .from(jobSourceCallbackEventsTable)
      .where(gte(jobSourceCallbackEventsTable.createdAt, cutoff));

    const totalRuns = Number(totalRunsRow?.value ?? 0);
    const completedRuns = Number(completedRunsRow?.value ?? 0);
    const retriesTriggered = Number(retriesTriggeredRow?.value ?? 0);
    const retryCompleted = Number(retryCompletedRow?.value ?? 0);
    const failuresByType: Record<string, number> = {};
    const failuresByCode: Record<string, number> = {};
    let completedEvents = 0;
    let failedEvents = 0;
    for (const item of callbackEvents) {
      if (item.status === 'COMPLETED') {
        completedEvents += 1;
      }
      if (item.status === 'FAILED') {
        failedEvents += 1;
      }
      if (!item.payload) {
        continue;
      }
      try {
        const parsed = JSON.parse(item.payload) as Record<string, unknown>;
        const type =
          typeof parsed.failureType === 'string' && parsed.failureType.trim() ? parsed.failureType.trim() : null;
        const code =
          typeof parsed.failureCode === 'string' && parsed.failureCode.trim() ? parsed.failureCode.trim() : null;
        if (type) {
          failuresByType[type] = (failuresByType[type] ?? 0) + 1;
        }
        if (code) {
          failuresByCode[code] = (failuresByCode[code] ?? 0) + 1;
        }
      } catch {
        // Ignore malformed payloads to keep metrics endpoint resilient.
      }
    }

    return {
      windowHours,
      queue: {
        activeRuns: Number(activeRunsRow?.value ?? 0),
        pendingRuns: Number(pendingRunsRow?.value ?? 0),
        runningRuns: Number(runningRunsRow?.value ?? 0),
        runningWithoutHeartbeat:
          Number(runningWithoutHeartbeatRow?.value ?? 0) + Number(runningStaleHeartbeatRow?.value ?? 0),
      },
      scrape: {
        totalRuns,
        completedRuns,
        failedRuns: Number(failedRunsRow?.value ?? 0),
        successRate: totalRuns ? Number((completedRuns / totalRuns).toFixed(4)) : 0,
      },
      offers: {
        totalUserOffers: Number(totalUserOffersRow?.value ?? 0),
        unscoredUserOffers: Number(unscoredUserOffersRow?.value ?? 0),
      },
      lifecycle: {
        staleReconciledRuns: Number(staleReconciledRunsRow?.value ?? 0),
        retriesTriggered,
        retrySuccessRate: retriesTriggered ? Number((retryCompleted / retriesTriggered).toFixed(4)) : 0,
      },
      callback: {
        totalEvents: callbackEvents.length,
        completedEvents,
        failedEvents,
        failedRate: callbackEvents.length ? Number((failedEvents / callbackEvents.length).toFixed(4)) : 0,
        failuresByType,
        failuresByCode,
      },
    };
  }

  async listCallbackEvents(input: { status?: string; sourceRunId?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const conditions = [];
    if (input.status) {
      conditions.push(eq(jobSourceCallbackEventsTable.status, input.status));
    }
    if (input.sourceRunId) {
      conditions.push(eq(jobSourceCallbackEventsTable.sourceRunId, input.sourceRunId));
    }

    const rows = await this.db
      .select({
        id: jobSourceCallbackEventsTable.id,
        sourceRunId: jobSourceCallbackEventsTable.sourceRunId,
        eventId: jobSourceCallbackEventsTable.eventId,
        attemptNo: jobSourceCallbackEventsTable.attemptNo,
        payloadHash: jobSourceCallbackEventsTable.payloadHash,
        status: jobSourceCallbackEventsTable.status,
        emittedAt: jobSourceCallbackEventsTable.emittedAt,
        receivedAt: jobSourceCallbackEventsTable.receivedAt,
        requestId: jobSourceCallbackEventsTable.requestId,
      })
      .from(jobSourceCallbackEventsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(jobSourceCallbackEventsTable.receivedAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows,
      limit,
      offset,
    };
  }

  async replayDeadLetters(requestId?: string) {
    const workerTaskUrl = this.configService.get('WORKER_TASK_URL', { infer: true });
    const workerAuthToken = this.configService.get('WORKER_AUTH_TOKEN', { infer: true });
    if (!workerTaskUrl) {
      throw new ServiceUnavailableException('WORKER_TASK_URL is not configured');
    }

    const replayUrl = workerTaskUrl.replace(/\/tasks\/?$/i, '/callbacks/replay');
    const response = await fetch(replayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerAuthToken ? { Authorization: `Bearer ${workerAuthToken}` } : {}),
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`Worker dead-letter replay failed: ${text}`);
    }

    return text ? (JSON.parse(text) as Record<string, unknown>) : { ok: true };
  }

  async reconcileRun(runId: string) {
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        status: jobSourceRunsTable.status,
        lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
        createdAt: jobSourceRunsTable.createdAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, runId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { ok: true, status: run.status, reconciled: false, reason: 'already-finalized' };
    }

    const staleRunningMinutes = this.configService.get('SCRAPE_STALE_RUNNING_MINUTES', { infer: true });
    const cutoff = new Date(Date.now() - staleRunningMinutes * 60 * 1000);
    const reference = run.lastHeartbeatAt ?? run.createdAt;
    if (!reference || reference >= cutoff) {
      return { ok: true, status: run.status, reconciled: false, reason: 'not-stale' };
    }

    const now = new Date();
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'FAILED',
        error: '[timeout] reconcile endpoint stale run',
        failureType: 'timeout',
        finalizedAt: now,
        completedAt: now,
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    return { ok: true, status: 'FAILED', reconciled: true };
  }
}

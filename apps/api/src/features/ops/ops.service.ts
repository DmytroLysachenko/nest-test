import { NotFoundException, ServiceUnavailableException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobSourceCallbackEventsTable, jobSourceRunsTable, scrapeSchedulesTable, userJobOffersTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

import type { Env } from '@/config/env';

@Injectable()
export class OpsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async getMetrics(windowHoursInput?: number) {
    const configuredWindowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const windowHours = Math.min(Math.max(windowHoursInput ?? configuredWindowHours, 1), 168);
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

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
    const [dueSchedulesRow] = await this.db
      .select({ value: count() })
      .from(scrapeSchedulesTable)
      .where(
        and(
          eq(scrapeSchedulesTable.enabled, 1),
          or(isNull(scrapeSchedulesTable.nextRunAt), lt(scrapeSchedulesTable.nextRunAt, now)),
        ),
      );
    const [enqueueFailuresRow] = await this.db
      .select({ value: count() })
      .from(scrapeSchedulesTable)
      .where(
        and(eq(scrapeSchedulesTable.lastRunStatus, 'ENQUEUE_FAILED'), gte(scrapeSchedulesTable.updatedAt, cutoff)),
      );
    const latestTrigger = await this.db
      .select({ lastTriggeredAt: scrapeSchedulesTable.lastTriggeredAt })
      .from(scrapeSchedulesTable)
      .where(isNotNull(scrapeSchedulesTable.lastTriggeredAt))
      .orderBy(desc(scrapeSchedulesTable.lastTriggeredAt))
      .limit(1)
      .then(([result]) => result ?? null);
    const callbackEvents = await this.db
      .select({
        status: jobSourceCallbackEventsTable.status,
        payload: jobSourceCallbackEventsTable.payload,
        attemptNo: jobSourceCallbackEventsTable.attemptNo,
        sourceRunId: jobSourceCallbackEventsTable.sourceRunId,
        eventId: jobSourceCallbackEventsTable.eventId,
        payloadHash: jobSourceCallbackEventsTable.payloadHash,
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
    let retriedEvents = 0;
    const conflictGroups = new Map<string, Set<string>>();
    for (const item of callbackEvents) {
      if (item.status === 'COMPLETED') {
        completedEvents += 1;
      }
      if (item.status === 'FAILED') {
        failedEvents += 1;
      }
      if ((item.attemptNo ?? 1) > 1) {
        retriedEvents += 1;
      }
      const key = `${item.sourceRunId}:${item.eventId}`;
      if (!conflictGroups.has(key)) {
        conflictGroups.set(key, new Set<string>());
      }
      const hashKey = item.payloadHash?.trim() ? item.payloadHash.trim() : '__empty__';
      conflictGroups.get(key)?.add(hashKey);
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
    const conflictingPayloadEvents24h = Array.from(conflictGroups.values()).filter((hashes) => hashes.size > 1).length;

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
        retryRate24h: callbackEvents.length ? Number((retriedEvents / callbackEvents.length).toFixed(4)) : 0,
        conflictingPayloadEvents24h,
        failuresByType,
        failuresByCode,
      },
      scheduler: {
        lastTriggerAt: latestTrigger?.lastTriggeredAt?.toISOString() ?? null,
        dueSchedules: Number(dueSchedulesRow?.value ?? 0),
        enqueueFailures24h: Number(enqueueFailuresRow?.value ?? 0),
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

  async exportCallbackEventsCsv(input: { status?: string; sourceRunId?: string; limit?: number; offset?: number }) {
    const data = await this.listCallbackEvents(input);
    const header = ['id', 'sourceRunId', 'eventId', 'attemptNo', 'status', 'payloadHash', 'emittedAt', 'receivedAt'];
    const rows = data.items.map((item) =>
      [
        item.id,
        item.sourceRunId,
        item.eventId,
        item.attemptNo ?? '',
        item.status,
        item.payloadHash ?? '',
        item.emittedAt?.toISOString?.() ?? item.emittedAt ?? '',
        item.receivedAt?.toISOString?.() ?? item.receivedAt ?? '',
      ]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
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

  async reconcileStaleRuns(windowHours = 24) {
    const safeWindowHours = Math.min(Math.max(windowHours, 1), 168);
    const now = new Date();
    const stalePendingMinutes = this.configService.get('SCRAPE_STALE_PENDING_MINUTES', { infer: true });
    const staleRunningMinutes = this.configService.get('SCRAPE_STALE_RUNNING_MINUTES', { infer: true });
    const stalePendingCutoff = new Date(now.getTime() - stalePendingMinutes * 60 * 1000);
    const staleRunningCutoff = new Date(now.getTime() - staleRunningMinutes * 60 * 1000);
    const staleError = '[timeout] reconcile endpoint stale run';

    const pendingCandidates = await this.db
      .select({ id: jobSourceRunsTable.id })
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.status, 'PENDING'), lt(jobSourceRunsTable.createdAt, stalePendingCutoff)));
    const runningCandidates = await this.db
      .select({ id: jobSourceRunsTable.id })
      .from(jobSourceRunsTable)
      .where(
        and(
          eq(jobSourceRunsTable.status, 'RUNNING'),
          or(
            lt(jobSourceRunsTable.lastHeartbeatAt, staleRunningCutoff),
            and(isNull(jobSourceRunsTable.lastHeartbeatAt), lt(jobSourceRunsTable.startedAt, staleRunningCutoff)),
            and(isNull(jobSourceRunsTable.startedAt), lt(jobSourceRunsTable.createdAt, staleRunningCutoff)),
          ),
        ),
      );

    const staleIds = [...pendingCandidates, ...runningCandidates].map((item) => item.id);
    if (staleIds.length) {
      await this.db
        .update(jobSourceRunsTable)
        .set({
          status: 'FAILED',
          error: staleError,
          failureType: 'timeout',
          finalizedAt: now,
          completedAt: now,
        })
        .where(inArray(jobSourceRunsTable.id, staleIds));
    }

    const windowCutoff = new Date(now.getTime() - safeWindowHours * 60 * 60 * 1000);
    const [reconciledInWindowRow] = await this.db
      .select({ value: count() })
      .from(jobSourceRunsTable)
      .where(
        and(
          eq(jobSourceRunsTable.status, 'FAILED'),
          eq(jobSourceRunsTable.failureType, 'timeout'),
          eq(jobSourceRunsTable.error, staleError),
          gte(jobSourceRunsTable.finalizedAt, windowCutoff),
        ),
      );

    return {
      ok: true,
      timestamp: now.toISOString(),
      windowHours: safeWindowHours,
      scanned: pendingCandidates.length + runningCandidates.length,
      reconciled: staleIds.length,
      failed: 0,
      reconciledInWindow: Number(reconciledInWindowRow?.value ?? 0),
    };
  }
}

import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import {
  apiRequestEventsTable,
  authorizationEventsTable,
  jobOffersTable,
  jobSourceCallbackEventsTable,
  jobSourceRunEventsTable,
  jobSourceRunsTable,
  scrapeExecutionEventsTable,
  scrapeScheduleEventsTable,
  scrapeSchedulesTable,
  userJobOffersTable,
  usersTable,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';

import type { Env } from '@/config/env';

type SupportApiRequestEventRow = {
  id: string;
  userId: string | null;
  requestId: string | null;
  level: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  errorCode: string | null;
  details: string[] | null;
  meta: unknown;
  createdAt: Date;
};

@Injectable()
export class OpsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
  ) {}

  async getMetrics(windowHoursInput?: number) {
    const configuredWindowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const windowHours = Math.min(Math.max(windowHoursInput ?? configuredWindowHours, 1), 168);
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    try {
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
      const [freshCatalogOffersRow] = await this.db
        .select({ value: count() })
        .from(jobOffersTable)
        .where(
          and(
            eq(jobOffersTable.qualityState, 'ACCEPTED'),
            eq(jobOffersTable.isExpired, false),
            gte(jobOffersTable.lastSeenAt, cutoff),
          ),
        );
      const [catalogMatchedRecentlyRow] = await this.db
        .select({ value: count() })
        .from(jobOffersTable)
        .where(gte(jobOffersTable.lastMatchedAt, cutoff));
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
      const conflictingPayloadEvents24h = Array.from(conflictGroups.values()).filter(
        (hashes) => hashes.size > 1,
      ).length;

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
        catalog: {
          freshAcceptedOffers: Number(freshCatalogOffersRow?.value ?? 0),
          matchedRecently: Number(catalogMatchedRecentlyRow?.value ?? 0),
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
    } catch (error) {
      this.logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          windowHours,
        },
        'Ops metrics degraded to fallback',
      );
      return this.emptyMetrics(windowHours);
    }
  }

  async getSupportOverview(windowHoursInput?: number) {
    const metrics = await this.safeLoad(
      'support-overview.metrics',
      () => this.getMetrics(windowHoursInput),
      this.emptyMetrics(windowHoursInput ?? 24),
    );
    const now = new Date();
    const cutoff = new Date(now.getTime() - metrics.windowHours * 60 * 60 * 1000);

    const [
      failedRuns,
      failedCallbackEvents,
      failedApiRequestEvents,
      failedScheduleExecutions,
      recentAuthorizationEvents,
      stageFailures,
    ] = await Promise.all([
      this.safeLoad(
        'support-overview.failed-runs',
        () =>
          this.db
            .select({
              id: jobSourceRunsTable.id,
              traceId: jobSourceRunsTable.traceId,
              userId: jobSourceRunsTable.userId,
              source: jobSourceRunsTable.source,
              status: jobSourceRunsTable.status,
              failureType: jobSourceRunsTable.failureType,
              error: jobSourceRunsTable.error,
              lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
              finalizedAt: jobSourceRunsTable.finalizedAt,
              createdAt: jobSourceRunsTable.createdAt,
            })
            .from(jobSourceRunsTable)
            .where(and(eq(jobSourceRunsTable.status, 'FAILED'), gte(jobSourceRunsTable.createdAt, cutoff)))
            .orderBy(desc(jobSourceRunsTable.finalizedAt), desc(jobSourceRunsTable.createdAt))
            .limit(10),
        [],
      ),
      this.safeLoad(
        'support-overview.callback-failures',
        () =>
          this.db
            .select({
              id: jobSourceCallbackEventsTable.id,
              sourceRunId: jobSourceCallbackEventsTable.sourceRunId,
              eventId: jobSourceCallbackEventsTable.eventId,
              requestId: jobSourceCallbackEventsTable.requestId,
              attemptNo: jobSourceCallbackEventsTable.attemptNo,
              status: jobSourceCallbackEventsTable.status,
              payloadHash: jobSourceCallbackEventsTable.payloadHash,
              receivedAt: jobSourceCallbackEventsTable.receivedAt,
            })
            .from(jobSourceCallbackEventsTable)
            .where(
              and(
                eq(jobSourceCallbackEventsTable.status, 'FAILED'),
                gte(jobSourceCallbackEventsTable.createdAt, cutoff),
              ),
            )
            .orderBy(desc(jobSourceCallbackEventsTable.receivedAt))
            .limit(10),
        [],
      ),
      this.safeLoad(
        'support-overview.api-failures',
        () =>
          this.db
            .select({
              id: apiRequestEventsTable.id,
              userId: apiRequestEventsTable.userId,
              requestId: apiRequestEventsTable.requestId,
              level: apiRequestEventsTable.level,
              method: apiRequestEventsTable.method,
              path: apiRequestEventsTable.path,
              statusCode: apiRequestEventsTable.statusCode,
              message: apiRequestEventsTable.message,
              errorCode: apiRequestEventsTable.errorCode,
              createdAt: apiRequestEventsTable.createdAt,
            })
            .from(apiRequestEventsTable)
            .where(
              and(
                gte(apiRequestEventsTable.createdAt, cutoff),
                or(eq(apiRequestEventsTable.level, 'ERROR'), eq(apiRequestEventsTable.level, 'WARN')),
              ),
            )
            .orderBy(desc(apiRequestEventsTable.createdAt))
            .limit(10),
        [],
      ),
      this.safeLoad(
        'support-overview.schedule-failures',
        () =>
          this.db
            .select({
              id: scrapeScheduleEventsTable.id,
              scheduleId: scrapeScheduleEventsTable.scheduleId,
              userId: scrapeScheduleEventsTable.userId,
              sourceRunId: scrapeScheduleEventsTable.sourceRunId,
              traceId: scrapeScheduleEventsTable.traceId,
              requestId: scrapeScheduleEventsTable.requestId,
              eventType: scrapeScheduleEventsTable.eventType,
              severity: scrapeScheduleEventsTable.severity,
              code: scrapeScheduleEventsTable.code,
              message: scrapeScheduleEventsTable.message,
              createdAt: scrapeScheduleEventsTable.createdAt,
            })
            .from(scrapeScheduleEventsTable)
            .where(
              and(
                gte(scrapeScheduleEventsTable.createdAt, cutoff),
                or(
                  eq(scrapeScheduleEventsTable.severity, 'error'),
                  eq(scrapeScheduleEventsTable.eventType, 'schedule_enqueue_failed'),
                ),
              ),
            )
            .orderBy(desc(scrapeScheduleEventsTable.createdAt))
            .limit(10),
        [],
      ),
      this.safeLoad(
        'support-overview.authorization-events',
        () =>
          this.db
            .select()
            .from(authorizationEventsTable)
            .where(
              and(eq(authorizationEventsTable.outcome, 'forbidden'), gte(authorizationEventsTable.createdAt, cutoff)),
            )
            .orderBy(desc(authorizationEventsTable.createdAt))
            .limit(10),
        [],
      ),
      this.safeLoad(
        'support-overview.stage-failures',
        () =>
          this.db
            .select({
              stage: scrapeExecutionEventsTable.stage,
              status: scrapeExecutionEventsTable.status,
              count: sql<number>`count(*)::int`,
            })
            .from(scrapeExecutionEventsTable)
            .where(
              and(
                gte(scrapeExecutionEventsTable.createdAt, cutoff),
                or(eq(scrapeExecutionEventsTable.status, 'failed'), eq(scrapeExecutionEventsTable.status, 'warning')),
              ),
            )
            .groupBy(scrapeExecutionEventsTable.stage, scrapeExecutionEventsTable.status)
            .orderBy(desc(sql<number>`count(*)::int`))
            .limit(10),
        [],
      ),
    ]);

    return {
      generatedAt: now.toISOString(),
      windowHours: metrics.windowHours,
      metrics,
      recentFailures: {
        scrapeRuns: failedRuns.map((run) => ({
          ...run,
          traceId: String(run.traceId),
          lastHeartbeatAt: this.toIsoString(run.lastHeartbeatAt),
          finalizedAt: this.toIsoString(run.finalizedAt),
          createdAt: this.toIsoString(run.createdAt),
        })),
        callbackEvents: failedCallbackEvents.map((event) => ({
          ...event,
          receivedAt: this.toIsoString(event.receivedAt),
        })),
        apiRequests: failedApiRequestEvents.map((event) => ({
          ...event,
          createdAt: this.toIsoString(event.createdAt),
        })),
        scheduleExecutions: failedScheduleExecutions.map((event) => ({
          ...event,
          traceId: event.traceId ? String(event.traceId) : null,
          createdAt: this.toIsoString(event.createdAt),
        })),
        authorizationEvents: recentAuthorizationEvents.map((event) => ({
          ...event,
          meta: this.asRecordOrNull(event.meta),
          createdAt: this.toIsoString(event.createdAt),
        })),
      },
      stageFailures,
    };
  }

  async getSupportScrapeForensics(runId: string) {
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        status: jobSourceRunsTable.status,
        failureType: jobSourceRunsTable.failureType,
        error: jobSourceRunsTable.error,
        createdAt: jobSourceRunsTable.createdAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, runId))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const executionEvents = await this.safeLoad(
      'support-run-forensics.execution-events',
      () =>
        this.db
          .select()
          .from(scrapeExecutionEventsTable)
          .where(eq(scrapeExecutionEventsTable.sourceRunId, runId))
          .orderBy(desc(scrapeExecutionEventsTable.createdAt)),
      [],
    );
    const runEvents = await this.safeLoad(
      'support-run-forensics.run-events',
      () =>
        this.db
          .select()
          .from(jobSourceRunEventsTable)
          .where(eq(jobSourceRunEventsTable.sourceRunId, runId))
          .orderBy(desc(jobSourceRunEventsTable.createdAt)),
      [],
    );
    const callbackEvents = await this.safeLoad(
      'support-run-forensics.callback-events',
      () =>
        this.db
          .select()
          .from(jobSourceCallbackEventsTable)
          .where(eq(jobSourceCallbackEventsTable.sourceRunId, runId))
          .orderBy(desc(jobSourceCallbackEventsTable.receivedAt)),
      [],
    );

    const groupedStages = executionEvents.reduce<Record<string, { total: number; failed: number; warning: number }>>(
      (acc, event) => {
        const current = acc[event.stage] ?? { total: 0, failed: 0, warning: 0 };
        current.total += 1;
        if (event.status === 'failed') {
          current.failed += 1;
        }
        if (event.status === 'warning') {
          current.warning += 1;
        }
        acc[event.stage] = current;
        return acc;
      },
      {},
    );

    return {
      run: {
        ...run,
        traceId: String(run.traceId),
        createdAt: this.toIsoString(run.createdAt),
      },
      stageSummary: groupedStages,
      executionEvents: executionEvents.map((event) => ({
        ...event,
        traceId: event.traceId ? String(event.traceId) : null,
        meta: this.asRecordOrNull(event.meta),
        createdAt: this.toIsoString(event.createdAt),
      })),
      runEvents: runEvents.map((event) => ({
        ...event,
        traceId: String(event.traceId),
        meta: this.asRecordOrNull(event.meta),
        createdAt: this.toIsoString(event.createdAt),
      })),
      callbackEvents: callbackEvents.map((event) => ({
        ...event,
        receivedAt: this.toIsoString(event.receivedAt),
        createdAt: this.toIsoString(event.createdAt),
        payloadSummary: this.summarizeCallbackPayload(event.payload),
      })),
    };
  }

  async exportSupportScrapeForensicsCsv(runId: string) {
    const forensic = await this.getSupportScrapeForensics(runId);
    const header = [
      'stream',
      'id',
      'createdAt',
      'stageOrEvent',
      'statusOrSeverity',
      'attemptNo',
      'code',
      'requestId',
      'message',
      'meta',
    ];
    const rows = [
      ...forensic.executionEvents.map((event) => [
        'execution',
        event.id,
        event.createdAt ?? '',
        event.stage,
        event.status,
        '',
        event.code ?? '',
        event.requestId ?? '',
        event.message,
        JSON.stringify(event.meta ?? {}),
      ]),
      ...forensic.runEvents.map((event) => [
        'run',
        event.id,
        event.createdAt ?? '',
        event.eventType,
        event.severity,
        event.attemptNo ?? '',
        event.code ?? '',
        event.requestId ?? '',
        event.message,
        JSON.stringify(event.meta ?? {}),
      ]),
      ...forensic.callbackEvents.map((event) => [
        'callback',
        event.id,
        event.receivedAt ?? event.createdAt ?? '',
        event.status,
        event.status,
        event.attemptNo ?? '',
        event.payloadHash ?? '',
        event.requestId ?? '',
        event.eventId,
        JSON.stringify(event.payloadSummary ?? {}),
      ]),
    ].map((row) => row.map((value) => this.toCsvCell(value)).join(','));

    return [header.join(','), ...rows].join('\n');
  }

  async getCatalogSummary(windowHoursInput?: number) {
    const windowHours = Math.min(Math.max(windowHoursInput ?? 72, 1), 720);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const [totalCatalogOffersRow] = await this.db.select({ value: count() }).from(jobOffersTable);
    const [freshAcceptedOffersRow] = await this.db
      .select({ value: count() })
      .from(jobOffersTable)
      .where(
        and(
          eq(jobOffersTable.qualityState, 'ACCEPTED'),
          eq(jobOffersTable.isExpired, false),
          gte(jobOffersTable.lastSeenAt, cutoff),
        ),
      );
    const [expiredOffersRow] = await this.db
      .select({ value: count() })
      .from(jobOffersTable)
      .where(eq(jobOffersTable.isExpired, true));
    const [matchedRecentlyRow] = await this.db
      .select({ value: count() })
      .from(jobOffersTable)
      .where(gte(jobOffersTable.lastMatchedAt, cutoff));
    const offersByQuality = await this.db
      .select({
        qualityState: jobOffersTable.qualityState,
        count: sql<number>`count(*)::int`,
      })
      .from(jobOffersTable)
      .groupBy(jobOffersTable.qualityState)
      .orderBy(desc(sql<number>`count(*)::int`));
    const userOfferOrigins = await this.db
      .select({
        origin: userJobOffersTable.origin,
        count: sql<number>`count(*)::int`,
      })
      .from(userJobOffersTable)
      .groupBy(userJobOffersTable.origin)
      .orderBy(desc(sql<number>`count(*)::int`));

    return {
      generatedAt: new Date().toISOString(),
      windowHours,
      totalCatalogOffers: Number(totalCatalogOffersRow?.value ?? 0),
      freshAcceptedOffers: Number(freshAcceptedOffersRow?.value ?? 0),
      expiredOffers: Number(expiredOffersRow?.value ?? 0),
      matchedRecently: Number(matchedRecentlyRow?.value ?? 0),
      offersByQuality,
      userOfferOrigins,
    };
  }

  async getSupportScrapeIncident(runId: string) {
    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        source: jobSourceRunsTable.source,
        userId: jobSourceRunsTable.userId,
        listingUrl: jobSourceRunsTable.listingUrl,
        filters: jobSourceRunsTable.filters,
        status: jobSourceRunsTable.status,
        failureType: jobSourceRunsTable.failureType,
        error: jobSourceRunsTable.error,
        totalFound: jobSourceRunsTable.totalFound,
        scrapedCount: jobSourceRunsTable.scrapedCount,
        lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
        startedAt: jobSourceRunsTable.startedAt,
        completedAt: jobSourceRunsTable.completedAt,
        finalizedAt: jobSourceRunsTable.finalizedAt,
        createdAt: jobSourceRunsTable.createdAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, runId))
      .limit(1)
      .then(([result]) => result ?? null);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const [timeline, callbackEvents] = await Promise.all([
      this.db
        .select({
          id: jobSourceRunEventsTable.id,
          eventType: jobSourceRunEventsTable.eventType,
          severity: jobSourceRunEventsTable.severity,
          requestId: jobSourceRunEventsTable.requestId,
          phase: jobSourceRunEventsTable.phase,
          attemptNo: jobSourceRunEventsTable.attemptNo,
          code: jobSourceRunEventsTable.code,
          message: jobSourceRunEventsTable.message,
          meta: jobSourceRunEventsTable.meta,
          createdAt: jobSourceRunEventsTable.createdAt,
        })
        .from(jobSourceRunEventsTable)
        .where(eq(jobSourceRunEventsTable.sourceRunId, run.id))
        .orderBy(desc(jobSourceRunEventsTable.createdAt))
        .limit(100),
      this.db
        .select({
          id: jobSourceCallbackEventsTable.id,
          eventId: jobSourceCallbackEventsTable.eventId,
          requestId: jobSourceCallbackEventsTable.requestId,
          attemptNo: jobSourceCallbackEventsTable.attemptNo,
          status: jobSourceCallbackEventsTable.status,
          payloadHash: jobSourceCallbackEventsTable.payloadHash,
          emittedAt: jobSourceCallbackEventsTable.emittedAt,
          receivedAt: jobSourceCallbackEventsTable.receivedAt,
          payload: jobSourceCallbackEventsTable.payload,
        })
        .from(jobSourceCallbackEventsTable)
        .where(eq(jobSourceCallbackEventsTable.sourceRunId, run.id))
        .orderBy(desc(jobSourceCallbackEventsTable.receivedAt))
        .limit(50),
    ]);

    const requestIds = this.collectUniqueStrings([
      ...timeline.map((event) => event.requestId),
      ...callbackEvents.map((event) => event.requestId),
    ]);
    const apiRequestEvents = requestIds.length ? await this.listApiRequestEventsByRequestIds(requestIds) : [];
    const latestTimelineEvent = timeline[0] ?? null;
    const acceptedCallbackEvent = callbackEvents.find((event) => event.status === 'COMPLETED') ?? null;
    const failedCallbackEvents = callbackEvents.filter((event) => event.status === 'FAILED').length;

    return {
      generatedAt: new Date().toISOString(),
      run: {
        ...run,
        traceId: String(run.traceId),
        filters: this.asRecordOrNull(run.filters),
        lastHeartbeatAt: this.toIsoString(run.lastHeartbeatAt),
        startedAt: this.toIsoString(run.startedAt),
        completedAt: this.toIsoString(run.completedAt),
        finalizedAt: this.toIsoString(run.finalizedAt),
        createdAt: this.toIsoString(run.createdAt),
      },
      signals: {
        lastHeartbeatAt: this.toIsoString(run.lastHeartbeatAt),
        lastTimelineEventAt: this.toIsoString(latestTimelineEvent?.createdAt),
        reconcileReason: run.error?.includes('reconcile endpoint stale run') ? run.error : null,
        likelyFailureStage: this.detectLikelyFailureStage({
          status: run.status,
          failureType: run.failureType,
          lastHeartbeatAt: run.lastHeartbeatAt,
          timeline,
          callbackEvents,
          error: run.error,
        }),
      },
      callbackSummary: {
        totalEvents: callbackEvents.length,
        failedEvents: failedCallbackEvents,
        latestReceivedAt: this.toIsoString(callbackEvents[0]?.receivedAt),
        latestAcceptedRequestId: acceptedCallbackEvent?.requestId ?? null,
      },
      timeline: timeline.map((event) => ({
        ...event,
        meta: this.asRecordOrNull(event.meta),
        createdAt: this.toIsoString(event.createdAt),
      })),
      callbackEvents: callbackEvents.map((event) => ({
        id: event.id,
        eventId: event.eventId,
        requestId: event.requestId,
        attemptNo: event.attemptNo,
        status: event.status,
        payloadHash: event.payloadHash,
        emittedAt: this.toIsoString(event.emittedAt),
        receivedAt: this.toIsoString(event.receivedAt),
        payloadSummary: this.summarizeCallbackPayload(event.payload),
      })),
      apiRequestEvents: apiRequestEvents.map((event) => this.mapApiRequestEvent(event)),
    };
  }

  async getSupportUserIncident(userId: string, windowHoursInput?: number) {
    const configuredWindowHours = this.configService.get('JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS', { infer: true });
    const windowHours = Math.min(Math.max(windowHoursInput ?? configuredWindowHours, 1), 168);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const user = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        lastLoginAt: usersTable.lastLoginAt,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then(([result]) => result ?? null);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      schedule,
      recentScrapeRuns,
      recentApiRequestEvents,
      recentScheduleEvents,
      statusCounts,
      totalOffersRow,
      unscoredOffersRow,
    ] = await Promise.all([
      this.db
        .select({
          enabled: scrapeSchedulesTable.enabled,
          cron: scrapeSchedulesTable.cron,
          timezone: scrapeSchedulesTable.timezone,
          source: scrapeSchedulesTable.source,
          limit: scrapeSchedulesTable.limit,
          nextRunAt: scrapeSchedulesTable.nextRunAt,
          lastTriggeredAt: scrapeSchedulesTable.lastTriggeredAt,
          lastRunStatus: scrapeSchedulesTable.lastRunStatus,
          filters: scrapeSchedulesTable.filters,
        })
        .from(scrapeSchedulesTable)
        .where(eq(scrapeSchedulesTable.userId, userId))
        .limit(1)
        .then(([result]) => result ?? null),
      this.db
        .select({
          id: jobSourceRunsTable.id,
          traceId: jobSourceRunsTable.traceId,
          source: jobSourceRunsTable.source,
          status: jobSourceRunsTable.status,
          failureType: jobSourceRunsTable.failureType,
          error: jobSourceRunsTable.error,
          finalizedAt: jobSourceRunsTable.finalizedAt,
          createdAt: jobSourceRunsTable.createdAt,
        })
        .from(jobSourceRunsTable)
        .where(eq(jobSourceRunsTable.userId, userId))
        .orderBy(desc(jobSourceRunsTable.createdAt))
        .limit(10),
      this.db
        .select({
          id: apiRequestEventsTable.id,
          userId: apiRequestEventsTable.userId,
          requestId: apiRequestEventsTable.requestId,
          level: apiRequestEventsTable.level,
          method: apiRequestEventsTable.method,
          path: apiRequestEventsTable.path,
          statusCode: apiRequestEventsTable.statusCode,
          message: apiRequestEventsTable.message,
          errorCode: apiRequestEventsTable.errorCode,
          details: apiRequestEventsTable.details,
          meta: apiRequestEventsTable.meta,
          createdAt: apiRequestEventsTable.createdAt,
        })
        .from(apiRequestEventsTable)
        .where(and(eq(apiRequestEventsTable.userId, userId), gte(apiRequestEventsTable.createdAt, cutoff)))
        .orderBy(desc(apiRequestEventsTable.createdAt))
        .limit(20),
      this.db
        .select({
          id: scrapeScheduleEventsTable.id,
          scheduleId: scrapeScheduleEventsTable.scheduleId,
          sourceRunId: scrapeScheduleEventsTable.sourceRunId,
          traceId: scrapeScheduleEventsTable.traceId,
          requestId: scrapeScheduleEventsTable.requestId,
          eventType: scrapeScheduleEventsTable.eventType,
          severity: scrapeScheduleEventsTable.severity,
          code: scrapeScheduleEventsTable.code,
          message: scrapeScheduleEventsTable.message,
          createdAt: scrapeScheduleEventsTable.createdAt,
        })
        .from(scrapeScheduleEventsTable)
        .where(and(eq(scrapeScheduleEventsTable.userId, userId), gte(scrapeScheduleEventsTable.createdAt, cutoff)))
        .orderBy(desc(scrapeScheduleEventsTable.createdAt))
        .limit(20),
      this.db
        .select({
          status: userJobOffersTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(userJobOffersTable)
        .where(eq(userJobOffersTable.userId, userId))
        .groupBy(userJobOffersTable.status),
      this.db
        .select({ value: count() })
        .from(userJobOffersTable)
        .where(eq(userJobOffersTable.userId, userId))
        .then(([row]) => row ?? { value: 0 }),
      this.db
        .select({ value: count() })
        .from(userJobOffersTable)
        .where(and(eq(userJobOffersTable.userId, userId), isNull(userJobOffersTable.matchScore)))
        .then(([row]) => row ?? { value: 0 }),
    ]);

    const statusCountsRecord = statusCounts.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = Number(item.count);
      return accumulator;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      windowHours,
      user: {
        ...user,
        lastLoginAt: this.toIsoString(user.lastLoginAt),
        deletedAt: this.toIsoString(user.deletedAt),
      },
      schedule: schedule
        ? {
            enabled: schedule.enabled === 1,
            cron: schedule.cron,
            timezone: schedule.timezone,
            source: schedule.source,
            limit: schedule.limit,
            nextRunAt: this.toIsoString(schedule.nextRunAt),
            lastTriggeredAt: this.toIsoString(schedule.lastTriggeredAt),
            lastRunStatus: schedule.lastRunStatus,
            filters: this.asRecordOrNull(schedule.filters),
          }
        : null,
      offerStats: {
        totalOffers: Number(totalOffersRow.value ?? 0),
        unscoredOffers: Number(unscoredOffersRow.value ?? 0),
        statusCounts: statusCountsRecord,
      },
      recentScrapeRuns: recentScrapeRuns.map((run) => ({
        ...run,
        traceId: String(run.traceId),
        finalizedAt: this.toIsoString(run.finalizedAt),
        createdAt: this.toIsoString(run.createdAt),
      })),
      recentScheduleEvents: recentScheduleEvents.map((event) => ({
        ...event,
        traceId: event.traceId ? String(event.traceId) : null,
        createdAt: this.toIsoString(event.createdAt),
      })),
      recentApiRequestEvents: recentApiRequestEvents.map((event) => this.mapApiRequestEvent(event)),
    };
  }

  async listSupportScheduleEvents(input: {
    userId?: string;
    sourceRunId?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const conditions = [];

    if (input.userId) {
      conditions.push(eq(scrapeScheduleEventsTable.userId, input.userId));
    }
    if (input.sourceRunId) {
      conditions.push(eq(scrapeScheduleEventsTable.sourceRunId, input.sourceRunId));
    }
    if (input.requestId) {
      conditions.push(eq(scrapeScheduleEventsTable.requestId, input.requestId));
    }

    const items = await this.db
      .select({
        id: scrapeScheduleEventsTable.id,
        scheduleId: scrapeScheduleEventsTable.scheduleId,
        userId: scrapeScheduleEventsTable.userId,
        sourceRunId: scrapeScheduleEventsTable.sourceRunId,
        traceId: scrapeScheduleEventsTable.traceId,
        requestId: scrapeScheduleEventsTable.requestId,
        eventType: scrapeScheduleEventsTable.eventType,
        severity: scrapeScheduleEventsTable.severity,
        code: scrapeScheduleEventsTable.code,
        message: scrapeScheduleEventsTable.message,
        meta: scrapeScheduleEventsTable.meta,
        createdAt: scrapeScheduleEventsTable.createdAt,
      })
      .from(scrapeScheduleEventsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(scrapeScheduleEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(scrapeScheduleEventsTable)
      .where(conditions.length ? and(...conditions) : undefined);

    return {
      items: items.map((event) => ({
        ...event,
        traceId: event.traceId ? String(event.traceId) : null,
        meta: this.asRecordOrNull(event.meta),
        createdAt: this.toIsoString(event.createdAt),
      })),
      limit,
      offset,
      total: Number(totalRow?.value ?? 0),
    };
  }

  async correlateSupport(input: { requestId?: string; traceId?: string; sourceRunId?: string; userId?: string }) {
    const requestId = input.requestId?.trim() || null;
    const traceId = input.traceId?.trim() || null;
    const sourceRunId = input.sourceRunId?.trim() || null;
    const userId = input.userId?.trim() || null;

    if (!requestId && !traceId && !sourceRunId && !userId) {
      throw new BadRequestException('At least one of requestId, traceId, sourceRunId, or userId is required');
    }

    const matches: Array<{
      kind: string;
      id: string;
      requestId: string | null;
      traceId: string | null;
      sourceRunId: string | null;
      userId: string | null;
      summary: Record<string, unknown> | null;
      createdAt: string;
    }> = [];
    const seenKeys = new Set<string>();
    const addMatch = (match: (typeof matches)[number]) => {
      const dedupeKey = `${match.kind}:${match.id}`;
      if (seenKeys.has(dedupeKey)) {
        return;
      }
      seenKeys.add(dedupeKey);
      matches.push(match);
    };

    if (sourceRunId || traceId || userId) {
      const runConditions = [];
      if (sourceRunId) runConditions.push(eq(jobSourceRunsTable.id, sourceRunId));
      if (traceId) runConditions.push(eq(jobSourceRunsTable.traceId, traceId));
      if (userId) runConditions.push(eq(jobSourceRunsTable.userId, userId));
      const runs = await this.db
        .select({
          id: jobSourceRunsTable.id,
          traceId: jobSourceRunsTable.traceId,
          userId: jobSourceRunsTable.userId,
          status: jobSourceRunsTable.status,
          failureType: jobSourceRunsTable.failureType,
          error: jobSourceRunsTable.error,
          createdAt: jobSourceRunsTable.createdAt,
        })
        .from(jobSourceRunsTable)
        .where(and(...runConditions))
        .orderBy(desc(jobSourceRunsTable.createdAt))
        .limit(20);
      for (const run of runs) {
        addMatch({
          kind: 'scrape-run',
          id: run.id,
          requestId: null,
          traceId: String(run.traceId),
          sourceRunId: run.id,
          userId: run.userId,
          summary: {
            status: run.status,
            failureType: run.failureType,
            error: run.error,
          },
          createdAt: this.toIsoString(run.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }

    if (sourceRunId || traceId || requestId) {
      const runEventConditions = [];
      if (sourceRunId) runEventConditions.push(eq(jobSourceRunEventsTable.sourceRunId, sourceRunId));
      if (traceId) runEventConditions.push(eq(jobSourceRunEventsTable.traceId, traceId));
      if (requestId) runEventConditions.push(eq(jobSourceRunEventsTable.requestId, requestId));
      const runEvents = await this.db
        .select({
          id: jobSourceRunEventsTable.id,
          sourceRunId: jobSourceRunEventsTable.sourceRunId,
          traceId: jobSourceRunEventsTable.traceId,
          requestId: jobSourceRunEventsTable.requestId,
          message: jobSourceRunEventsTable.message,
          eventType: jobSourceRunEventsTable.eventType,
          severity: jobSourceRunEventsTable.severity,
          createdAt: jobSourceRunEventsTable.createdAt,
        })
        .from(jobSourceRunEventsTable)
        .where(and(...runEventConditions))
        .orderBy(desc(jobSourceRunEventsTable.createdAt))
        .limit(20);
      for (const event of runEvents) {
        addMatch({
          kind: 'scrape-run-event',
          id: event.id,
          requestId: event.requestId,
          traceId: String(event.traceId),
          sourceRunId: event.sourceRunId,
          userId: null,
          summary: {
            eventType: event.eventType,
            severity: event.severity,
            message: event.message,
          },
          createdAt: this.toIsoString(event.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }

    if (sourceRunId || requestId || userId) {
      const scheduleEventConditions = [];
      if (sourceRunId) scheduleEventConditions.push(eq(scrapeScheduleEventsTable.sourceRunId, sourceRunId));
      if (requestId) scheduleEventConditions.push(eq(scrapeScheduleEventsTable.requestId, requestId));
      if (userId) scheduleEventConditions.push(eq(scrapeScheduleEventsTable.userId, userId));
      const scheduleEvents = await this.db
        .select({
          id: scrapeScheduleEventsTable.id,
          userId: scrapeScheduleEventsTable.userId,
          sourceRunId: scrapeScheduleEventsTable.sourceRunId,
          traceId: scrapeScheduleEventsTable.traceId,
          requestId: scrapeScheduleEventsTable.requestId,
          eventType: scrapeScheduleEventsTable.eventType,
          severity: scrapeScheduleEventsTable.severity,
          message: scrapeScheduleEventsTable.message,
          createdAt: scrapeScheduleEventsTable.createdAt,
        })
        .from(scrapeScheduleEventsTable)
        .where(and(...scheduleEventConditions))
        .orderBy(desc(scrapeScheduleEventsTable.createdAt))
        .limit(20);
      for (const event of scheduleEvents) {
        addMatch({
          kind: 'schedule-event',
          id: event.id,
          requestId: event.requestId,
          traceId: event.traceId ? String(event.traceId) : null,
          sourceRunId: event.sourceRunId,
          userId: event.userId,
          summary: {
            eventType: event.eventType,
            severity: event.severity,
            message: event.message,
          },
          createdAt: this.toIsoString(event.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }

    if (sourceRunId || requestId) {
      const callbackConditions = [];
      if (sourceRunId) callbackConditions.push(eq(jobSourceCallbackEventsTable.sourceRunId, sourceRunId));
      if (requestId) callbackConditions.push(eq(jobSourceCallbackEventsTable.requestId, requestId));
      const callbackEvents = await this.db
        .select({
          id: jobSourceCallbackEventsTable.id,
          sourceRunId: jobSourceCallbackEventsTable.sourceRunId,
          requestId: jobSourceCallbackEventsTable.requestId,
          eventId: jobSourceCallbackEventsTable.eventId,
          status: jobSourceCallbackEventsTable.status,
          attemptNo: jobSourceCallbackEventsTable.attemptNo,
          receivedAt: jobSourceCallbackEventsTable.receivedAt,
        })
        .from(jobSourceCallbackEventsTable)
        .where(and(...callbackConditions))
        .orderBy(desc(jobSourceCallbackEventsTable.receivedAt))
        .limit(20);
      for (const event of callbackEvents) {
        addMatch({
          kind: 'callback-event',
          id: event.id,
          requestId: event.requestId,
          traceId: null,
          sourceRunId: event.sourceRunId,
          userId: null,
          summary: {
            eventId: event.eventId,
            status: event.status,
            attemptNo: event.attemptNo,
          },
          createdAt: this.toIsoString(event.receivedAt) ?? new Date(0).toISOString(),
        });
      }
    }

    if (requestId || traceId || userId) {
      const apiEventConditions = [];
      if (requestId) apiEventConditions.push(eq(apiRequestEventsTable.requestId, requestId));
      if (traceId) apiEventConditions.push(this.traceIdCondition(traceId));
      if (userId) apiEventConditions.push(eq(apiRequestEventsTable.userId, userId));
      const apiEvents = await this.db
        .select({
          id: apiRequestEventsTable.id,
          userId: apiRequestEventsTable.userId,
          requestId: apiRequestEventsTable.requestId,
          level: apiRequestEventsTable.level,
          path: apiRequestEventsTable.path,
          statusCode: apiRequestEventsTable.statusCode,
          message: apiRequestEventsTable.message,
          createdAt: apiRequestEventsTable.createdAt,
        })
        .from(apiRequestEventsTable)
        .where(and(...apiEventConditions))
        .orderBy(desc(apiRequestEventsTable.createdAt))
        .limit(20);
      for (const event of apiEvents) {
        addMatch({
          kind: 'api-request-event',
          id: event.id,
          requestId: event.requestId,
          traceId,
          sourceRunId: null,
          userId: event.userId,
          summary: {
            level: event.level,
            path: event.path,
            statusCode: event.statusCode,
            message: event.message,
          },
          createdAt: this.toIsoString(event.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }

    matches.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return {
      generatedAt: new Date().toISOString(),
      requestId,
      traceId,
      sourceRunId,
      userId,
      matches,
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
        .map((value) => this.toCsvCell(value))
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }

  async listApiRequestEvents(input: {
    level?: string;
    statusCode?: number;
    path?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const conditions = [];

    if (input.level) {
      conditions.push(eq(apiRequestEventsTable.level, input.level.toUpperCase()));
    }
    if (input.statusCode !== undefined) {
      conditions.push(eq(apiRequestEventsTable.statusCode, input.statusCode));
    }
    if (input.path) {
      conditions.push(ilike(apiRequestEventsTable.path, `%${input.path}%`));
    }
    if (input.requestId) {
      conditions.push(eq(apiRequestEventsTable.requestId, input.requestId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: apiRequestEventsTable.id,
        userId: apiRequestEventsTable.userId,
        requestId: apiRequestEventsTable.requestId,
        level: apiRequestEventsTable.level,
        method: apiRequestEventsTable.method,
        path: apiRequestEventsTable.path,
        statusCode: apiRequestEventsTable.statusCode,
        message: apiRequestEventsTable.message,
        errorCode: apiRequestEventsTable.errorCode,
        details: apiRequestEventsTable.details,
        meta: apiRequestEventsTable.meta,
        createdAt: apiRequestEventsTable.createdAt,
      })
      .from(apiRequestEventsTable)
      .where(whereClause)
      .orderBy(desc(apiRequestEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await this.db.select({ value: count() }).from(apiRequestEventsTable).where(whereClause);

    const statusSummary = await this.db
      .select({
        statusCode: apiRequestEventsTable.statusCode,
        count: sql<number>`count(*)::int`,
      })
      .from(apiRequestEventsTable)
      .where(whereClause)
      .groupBy(apiRequestEventsTable.statusCode)
      .orderBy(desc(sql<number>`count(*)::int`), desc(apiRequestEventsTable.statusCode))
      .limit(5);

    return {
      items: rows,
      limit,
      offset,
      total: Number(totalRow?.value ?? 0),
      statusSummary,
    };
  }

  async listAuthorizationEvents(input: {
    permission?: string;
    outcome?: string;
    userId?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);
    const conditions = [];

    if (input.permission) {
      conditions.push(eq(authorizationEventsTable.permission, input.permission));
    }
    if (input.outcome) {
      conditions.push(eq(authorizationEventsTable.outcome, input.outcome));
    }
    if (input.userId) {
      conditions.push(eq(authorizationEventsTable.userId, input.userId));
    }
    if (input.requestId) {
      conditions.push(eq(authorizationEventsTable.requestId, input.requestId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const rows = await this.db
      .select()
      .from(authorizationEventsTable)
      .where(whereClause)
      .orderBy(desc(authorizationEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await this.db.select({ value: count() }).from(authorizationEventsTable).where(whereClause);

    return {
      items: rows.map((row) => ({
        ...row,
        meta: this.asRecordOrNull(row.meta),
        createdAt: this.toIsoString(row.createdAt),
      })),
      limit,
      offset,
      total: Number(totalRow?.value ?? 0),
    };
  }

  async exportAuthorizationEventsCsv(input: {
    permission?: string;
    outcome?: string;
    userId?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  }) {
    const data = await this.listAuthorizationEvents(input);
    const header = [
      'id',
      'userId',
      'role',
      'permission',
      'resource',
      'action',
      'outcome',
      'requestId',
      'method',
      'path',
      'reason',
      'createdAt',
      'meta',
    ];
    const rows = data.items.map((item) =>
      [
        item.id,
        item.userId ?? '',
        item.role,
        item.permission,
        item.resource,
        item.action,
        item.outcome,
        item.requestId ?? '',
        item.method ?? '',
        item.path ?? '',
        item.reason ?? '',
        item.createdAt ?? '',
        JSON.stringify(item.meta ?? {}),
      ]
        .map((value) => this.toCsvCell(value))
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

  private async listApiRequestEventsByRequestIds(requestIds: string[]) {
    return this.db
      .select({
        id: apiRequestEventsTable.id,
        userId: apiRequestEventsTable.userId,
        requestId: apiRequestEventsTable.requestId,
        level: apiRequestEventsTable.level,
        method: apiRequestEventsTable.method,
        path: apiRequestEventsTable.path,
        statusCode: apiRequestEventsTable.statusCode,
        message: apiRequestEventsTable.message,
        errorCode: apiRequestEventsTable.errorCode,
        details: apiRequestEventsTable.details,
        meta: apiRequestEventsTable.meta,
        createdAt: apiRequestEventsTable.createdAt,
      })
      .from(apiRequestEventsTable)
      .where(inArray(apiRequestEventsTable.requestId, requestIds))
      .orderBy(desc(apiRequestEventsTable.createdAt))
      .limit(50);
  }

  private mapApiRequestEvent(row: SupportApiRequestEventRow) {
    return {
      ...row,
      meta: this.asRecordOrNull(row.meta),
      createdAt: this.toIsoString(row.createdAt),
    };
  }

  private detectLikelyFailureStage(input: {
    status: string;
    failureType: string | null;
    lastHeartbeatAt: Date | null;
    timeline: Array<{ eventType: string; phase: string | null }>;
    callbackEvents: Array<{ status: string }>;
    error: string | null;
  }) {
    if (input.status === 'COMPLETED') {
      return 'completed';
    }
    if (input.failureType === 'timeout' && input.error?.includes('reconcile endpoint stale run')) {
      if (!input.lastHeartbeatAt) {
        return 'worker-not-started-or-heartbeat-missing';
      }
      if (!input.callbackEvents.some((event) => event.status === 'COMPLETED')) {
        return 'worker-heartbeat-stopped-before-callback';
      }
      return 'callback-accepted-but-run-still-reconciled';
    }
    if (input.callbackEvents.some((event) => event.status === 'FAILED')) {
      return 'callback-rejected-or-retried';
    }
    if (input.timeline.some((event) => event.eventType === 'worker.accepted')) {
      return 'worker-processing-failed-before-finalization';
    }
    return 'unknown';
  }

  private summarizeCallbackPayload(payload: string | null) {
    const parsedPayload = this.safeParseJson(payload);
    if (!parsedPayload) {
      return null;
    }

    const result: Record<string, unknown> = {};
    for (const key of ['status', 'failureType', 'failureCode', 'traceId', 'attemptNo']) {
      if (key in parsedPayload) {
        result[key] = parsedPayload[key];
      }
    }

    return Object.keys(result).length ? result : parsedPayload;
  }

  private safeParseJson(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private traceIdCondition(traceId: string) {
    return sql<boolean>`${apiRequestEventsTable.meta} ->> 'traceId' = ${traceId}`;
  }

  private asRecordOrNull(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private collectUniqueStrings(values: Array<string | null | undefined>) {
    return Array.from(
      new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)),
    );
  }

  private toCsvCell(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private toIsoString(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.toISOString();
  }

  private async safeLoad<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await load();
    } catch (error) {
      this.logger.warn(
        {
          label,
          error: error instanceof Error ? error.message : String(error),
        },
        'Ops query degraded to fallback',
      );
      return fallback;
    }
  }

  private emptyMetrics(windowHours: number) {
    return {
      windowHours,
      queue: {
        activeRuns: 0,
        pendingRuns: 0,
        runningRuns: 0,
        runningWithoutHeartbeat: 0,
      },
      scrape: {
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        successRate: 0,
      },
      offers: {
        totalUserOffers: 0,
        unscoredUserOffers: 0,
      },
      catalog: {
        freshAcceptedOffers: 0,
        matchedRecently: 0,
      },
      lifecycle: {
        staleReconciledRuns: 0,
        retriesTriggered: 0,
        retrySuccessRate: 0,
      },
      callback: {
        totalEvents: 0,
        completedEvents: 0,
        failedEvents: 0,
        failedRate: 0,
        retryRate24h: 0,
        conflictingPayloadEvents24h: 0,
        failuresByType: {},
        failuresByCode: {},
      },
      scheduler: {
        lastTriggerAt: null,
        dueSchedules: 0,
        enqueueFailures24h: 0,
      },
    };
  }
}

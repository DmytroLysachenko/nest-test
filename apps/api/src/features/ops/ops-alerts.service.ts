import { createHash } from 'node:crypto';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { opsAlertEventsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

import { OpsService } from './ops.service';

import type { Env } from '@/config/env';

type OpsMetricsSnapshot = Awaited<ReturnType<OpsService['getMetrics']>>;
type ActiveAlert = {
  key: keyof OpsMetricsSnapshot['alerts'];
  title: string;
  summary: string;
  count: number;
};

const ALERT_KEY = 'ops-active-metrics';
const ALERT_CHANNEL = 'webhook';

@Injectable()
export class OpsAlertsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    private readonly opsService: OpsService,
  ) {}

  async dispatchActiveAlerts(windowHoursInput?: number) {
    const windowHours = windowHoursInput ?? this.configService.get('OPS_ALERTS_WINDOW_HOURS', { infer: true });
    const metrics = await this.opsService.getMetrics(windowHours);
    const activeAlerts = this.buildActiveAlerts(metrics);
    if (activeAlerts.length === 0) {
      return { ok: true, delivered: false, reason: 'no-active-alerts', windowHours, activeAlerts };
    }

    const webhookUrl = this.configService.get('OPS_ALERTS_WEBHOOK_URL', { infer: true });
    if (!webhookUrl) {
      this.logger.warn({ alertKey: ALERT_KEY, activeAlerts }, 'Ops alerts webhook is not configured');
      return { ok: true, delivered: false, reason: 'webhook-disabled', windowHours, activeAlerts };
    }

    const payloadBase = {
      alertKey: ALERT_KEY,
      windowHours,
      activeAlerts,
      metrics: {
        queue: metrics.queue,
        scrape: metrics.scrape,
        callback: {
          deadLetters24h: metrics.callback.deadLetters24h,
          failedRate: metrics.callback.failedRate,
        },
        ingest: metrics.ingest,
        scheduler: metrics.scheduler,
        offers: {
          reminderDeliveryFailures24h: metrics.offers.reminderDeliveryFailures24h,
        },
        careerProfiles: {
          failedProfiles: metrics.careerProfiles.failedProfiles,
        },
      },
    };
    const payload = {
      ...payloadBase,
      generatedAt: new Date().toISOString(),
    };
    const payloadHash = createHash('sha256').update(JSON.stringify(payloadBase)).digest('hex');
    const cooldownMinutes = this.configService.get('OPS_ALERTS_COOLDOWN_MINUTES', { infer: true });
    const recentCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    const [recentDelivery] = await this.db
      .select({
        payloadHash: opsAlertEventsTable.payloadHash,
        deliveredAt: opsAlertEventsTable.deliveredAt,
      })
      .from(opsAlertEventsTable)
      .where(
        and(
          eq(opsAlertEventsTable.channel, ALERT_CHANNEL),
          eq(opsAlertEventsTable.alertKey, ALERT_KEY),
          eq(opsAlertEventsTable.status, 'delivered'),
        ),
      )
      .orderBy(desc(opsAlertEventsTable.createdAt))
      .limit(1);

    if (
      recentDelivery?.payloadHash === payloadHash &&
      recentDelivery.deliveredAt &&
      recentDelivery.deliveredAt >= recentCutoff
    ) {
      return {
        ok: true,
        delivered: false,
        reason: 'cooldown-active',
        windowHours,
        activeAlerts,
        lastDeliveredAt: recentDelivery.deliveredAt.toISOString(),
      };
    }

    const bearerToken = this.configService.get('OPS_ALERTS_WEBHOOK_BEARER_TOKEN', { infer: true });
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify(payload),
    }).catch(async (error) => {
      await this.recordAlertEvent({
        payloadHash,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        meta: { activeAlertKeys: activeAlerts.map((item) => item.key), windowHours },
      });
      throw error;
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      await this.recordAlertEvent({
        payloadHash,
        status: 'failed',
        httpStatus: response.status,
        error: responseText || `Webhook responded with ${response.status}`,
        meta: { activeAlertKeys: activeAlerts.map((item) => item.key), windowHours },
      });
      throw new ServiceUnavailableException('Ops alerts webhook rejected the notification');
    }

    await this.recordAlertEvent({
      payloadHash,
      status: 'delivered',
      httpStatus: response.status,
      deliveredAt: new Date(),
      meta: { activeAlertKeys: activeAlerts.map((item) => item.key), windowHours },
    });

    return {
      ok: true,
      delivered: true,
      reason: 'sent',
      windowHours,
      activeAlerts,
      payloadHash,
    };
  }

  private buildActiveAlerts(metrics: OpsMetricsSnapshot): ActiveAlert[] {
    const alerts: Array<ActiveAlert | null> = [
      metrics.alerts.staleRuns
        ? {
            key: 'staleRuns',
            title: 'Stale scrape runs detected',
            summary: 'Running scrape jobs are missing heartbeats or required reconciliation.',
            count: metrics.queue.runningWithoutHeartbeat + metrics.lifecycle.staleReconciledRuns,
          }
        : null,
      metrics.alerts.callbackDeadLetters
        ? {
            key: 'callbackDeadLetters',
            title: 'Worker callback dead letters present',
            summary: 'Terminal worker callbacks reached dead-letter state in the current metrics window.',
            count: metrics.callback.deadLetters24h,
          }
        : null,
      metrics.alerts.incrementalIngestDeadLetters
        ? {
            key: 'incrementalIngestDeadLetters',
            title: 'Incremental ingest dead letters present',
            summary: 'Accepted-offer batch ingest had dead-lettered deliveries in the current metrics window.',
            count: metrics.ingest.incrementalDeadLetters24h,
          }
        : null,
      metrics.alerts.sourceDegradation
        ? {
            key: 'sourceDegradation',
            title: 'Source degradation detected',
            summary: 'Completed scrapes were marked degraded and may have reduced catalog usefulness.',
            count: 1,
          }
        : null,
      metrics.alerts.scheduleEnqueueFailures
        ? {
            key: 'scheduleEnqueueFailures',
            title: 'Schedule enqueue failures detected',
            summary: 'Automation schedules failed to enqueue one or more scrape runs.',
            count: metrics.scheduler.enqueueFailures24h,
          }
        : null,
      metrics.alerts.reminderDeliveryFailures
        ? {
            key: 'reminderDeliveryFailures',
            title: 'Reminder delivery failures detected',
            summary: 'External reminder delivery failed and requires support follow-up.',
            count: metrics.offers.reminderDeliveryFailures24h,
          }
        : null,
      metrics.alerts.careerProfileGenerationFailures
        ? {
            key: 'careerProfileGenerationFailures',
            title: 'Career profile generation failures detected',
            summary: 'Career profile generation has recent failed jobs that may block scrape planning.',
            count: metrics.careerProfiles.failedProfiles,
          }
        : null,
    ];

    return alerts.filter((item): item is ActiveAlert => Boolean(item));
  }

  private async recordAlertEvent(input: {
    payloadHash: string;
    status: 'delivered' | 'failed';
    httpStatus?: number;
    deliveredAt?: Date;
    error?: string;
    meta?: Record<string, unknown>;
  }) {
    await this.db.insert(opsAlertEventsTable).values({
      channel: ALERT_CHANNEL,
      alertKey: ALERT_KEY,
      payloadHash: input.payloadHash,
      status: input.status,
      httpStatus: input.httpStatus ?? null,
      deliveredAt: input.deliveredAt ?? null,
      error: input.error ?? null,
      meta: input.meta ?? null,
    });
  }
}

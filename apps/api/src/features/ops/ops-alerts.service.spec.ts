import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { OpsAlertsService } from './ops-alerts.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => overrides[key]),
  }) as any;

const createLogger = () =>
  ({
    warn: jest.fn(),
  }) as any;

const buildMetrics = () =>
  ({
    windowHours: 24,
    queue: { activeRuns: 1, pendingRuns: 0, runningRuns: 1, runningWithoutHeartbeat: 1 },
    scrape: { totalRuns: 10, completedRuns: 8, failedRuns: 2, successRate: 0.8 },
    offers: { totalUserOffers: 40, unscoredUserOffers: 5, reminderDeliveryFailures24h: 0 },
    careerProfiles: { totalProfiles: 10, pendingProfiles: 1, failedProfiles: 0 },
    catalog: {
      freshAcceptedOffers: 5,
      matchedRecently: 5,
      offersWithoutCategory: 0,
      offersWithoutEmploymentType: 0,
      redundantCompanyAliases: 0,
      suspiciousContractTypes: 0,
    },
    lifecycle: { staleReconciledRuns: 1, retriesTriggered: 0, retrySuccessRate: 0 },
    callback: {
      totalEvents: 4,
      completedEvents: 3,
      failedEvents: 1,
      failedRate: 0.25,
      retryRate24h: 0.25,
      conflictingPayloadEvents24h: 0,
      deadLetters24h: 2,
      failuresByType: {},
      failuresByCode: {},
    },
    ingest: { incrementalDeadLetters24h: 0 },
    scheduler: { lastTriggerAt: null, dueSchedules: 0, enqueueFailures24h: 0 },
    alerts: {
      staleRuns: true,
      callbackDeadLetters: true,
      incrementalIngestDeadLetters: false,
      sourceDegradation: false,
      scheduleEnqueueFailures: false,
      reminderDeliveryFailures: false,
      careerProfileGenerationFailures: false,
    },
  }) as const;

const buildExpectedPayloadHash = () => {
  const metrics = buildMetrics();
  return createHash('sha256')
    .update(
      JSON.stringify({
        alertKey: 'ops-active-metrics',
        windowHours: 24,
        activeAlerts: [
          {
            key: 'staleRuns',
            title: 'Stale scrape runs detected',
            summary: 'Running scrape jobs are missing heartbeats or required reconciliation.',
            count: 2,
          },
          {
            key: 'callbackDeadLetters',
            title: 'Worker callback dead letters present',
            summary: 'Terminal worker callbacks reached dead-letter state in the current metrics window.',
            count: 2,
          },
        ],
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
      }),
    )
    .digest('hex');
};

describe('OpsAlertsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('delivers an ops alerts webhook and records the event', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
    }) as any;
    const selectLimit = jest.fn().mockResolvedValue([]);
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: selectLimit,
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: insertValues,
      }),
    } as any;
    const opsService = {
      getMetrics: jest.fn().mockResolvedValue(buildMetrics()),
    } as any;

    const service = new OpsAlertsService(
      db,
      createConfigService({
        OPS_ALERTS_WEBHOOK_URL: 'https://alerts.example.com/webhook',
        OPS_ALERTS_COOLDOWN_MINUTES: 60,
        OPS_ALERTS_WINDOW_HOURS: 24,
      }),
      createLogger(),
      opsService,
    );

    const result = await service.dispatchActiveAlerts();

    expect(result).toMatchObject({ delivered: true, reason: 'sent' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'webhook',
        alertKey: 'ops-active-metrics',
        status: 'delivered',
        httpStatus: 202,
      }),
    );
  });

  it('skips delivery when the same payload was already delivered within cooldown', async () => {
    global.fetch = jest.fn();
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  payloadHash: buildExpectedPayloadHash(),
                  deliveredAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      }),
      insert: jest.fn(),
    } as any;
    const opsService = {
      getMetrics: jest.fn().mockResolvedValue(buildMetrics()),
    } as any;

    const service = new OpsAlertsService(
      db,
      createConfigService({
        OPS_ALERTS_WEBHOOK_URL: 'https://alerts.example.com/webhook',
        OPS_ALERTS_COOLDOWN_MINUTES: 60,
        OPS_ALERTS_WINDOW_HOURS: 24,
      }),
      createLogger(),
      opsService,
    );

    const result = await service.dispatchActiveAlerts();

    expect(result).toMatchObject({ delivered: false, reason: 'cooldown-active' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('records failed delivery attempts when the webhook rejects the payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('broken'),
    }) as any;
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: insertValues,
      }),
    } as any;
    const opsService = {
      getMetrics: jest.fn().mockResolvedValue(buildMetrics()),
    } as any;

    const service = new OpsAlertsService(
      db,
      createConfigService({
        OPS_ALERTS_WEBHOOK_URL: 'https://alerts.example.com/webhook',
        OPS_ALERTS_COOLDOWN_MINUTES: 60,
        OPS_ALERTS_WINDOW_HOURS: 24,
      }),
      createLogger(),
      opsService,
    );

    await expect(service.dispatchActiveAlerts()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'webhook',
        alertKey: 'ops-active-metrics',
        status: 'failed',
        httpStatus: 500,
        error: 'broken',
      }),
    );
  });
});

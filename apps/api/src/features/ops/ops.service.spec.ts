import { jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { OpsService } from './ops.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => overrides[key]),
  }) as any;

describe('OpsService', () => {
  it('returns aggregated queue/scrape/offer/lifecycle metrics', async () => {
    const runWhere = jest
      .fn()
      .mockResolvedValueOnce([{ value: 3 }]) // active
      .mockResolvedValueOnce([{ value: 1 }]) // pending
      .mockResolvedValueOnce([{ value: 2 }]) // running
      .mockResolvedValueOnce([{ value: 1 }]) // running without heartbeat
      .mockResolvedValueOnce([{ value: 1 }]) // running with stale heartbeat
      .mockResolvedValueOnce([{ value: 10 }]) // total
      .mockResolvedValueOnce([{ value: 8 }]) // completed
      .mockResolvedValueOnce([{ value: 2 }]) // failed
      .mockResolvedValueOnce([{ value: 1 }]) // stale reconciled
      .mockResolvedValueOnce([{ value: 4 }]) // retries triggered
      .mockResolvedValueOnce([{ value: 3 }]); // retry completed
    const offerWhere = jest.fn().mockResolvedValueOnce([{ value: 4 }]); // unscored

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockResolvedValue([{ value: 40 }]) }) // total offers
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: offerWhere }) }) // unscored
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 2 }]) }),
        }) // due schedules
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 1 }]) }),
        }) // enqueue failures
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) =>
                    Promise.resolve(cb([{ lastTriggeredAt: new Date('2026-03-03T10:00:00.000Z') }])),
                }),
              }),
            }),
          }),
        }) // latest trigger
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                status: 'FAILED',
                payload: JSON.stringify({ failureType: 'network', failureCode: 'WORKER_NETWORK' }),
                attemptNo: 2,
                sourceRunId: 'run-1',
                eventId: 'evt-1',
                payloadHash: 'hash-a',
              },
              {
                status: 'COMPLETED',
                payload: JSON.stringify({}),
                attemptNo: 1,
                sourceRunId: 'run-1',
                eventId: 'evt-1',
                payloadHash: 'hash-b',
              },
            ]),
          }),
        }),
    } as any;

    const service = new OpsService(
      db,
      createConfigService({
        JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: 72,
      }),
    );

    const result = await service.getMetrics();

    expect(result.windowHours).toBe(72);
    expect(result.queue.activeRuns).toBe(3);
    expect(result.queue.runningWithoutHeartbeat).toBe(2);
    expect(result.scrape.totalRuns).toBe(10);
    expect(result.scrape.successRate).toBe(0.8);
    expect(result.offers.unscoredUserOffers).toBe(4);
    expect(result.lifecycle.staleReconciledRuns).toBe(1);
    expect(result.lifecycle.retriesTriggered).toBe(4);
    expect(result.lifecycle.retrySuccessRate).toBe(0.75);
    expect(result.callback.totalEvents).toBe(2);
    expect(result.callback.failedEvents).toBe(1);
    expect(result.callback.failedRate).toBe(0.5);
    expect(result.callback.retryRate24h).toBe(0.5);
    expect(result.callback.conflictingPayloadEvents24h).toBe(1);
    expect(result.callback.failuresByType.network).toBe(1);
    expect(result.callback.failuresByCode.WORKER_NETWORK).toBe(1);
    expect(result.scheduler.lastTriggerAt).toBe('2026-03-03T10:00:00.000Z');
    expect(result.scheduler.dueSchedules).toBe(2);
    expect(result.scheduler.enqueueFailures24h).toBe(1);
  });

  it('lists callback events with pagination envelope', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([
                  {
                    id: 'event-1',
                    sourceRunId: 'run-1',
                    eventId: 'evt-1',
                    attemptNo: 1,
                    payloadHash: 'hash-1',
                    status: 'COMPLETED',
                    emittedAt: new Date('2026-03-03T10:00:00.000Z'),
                    receivedAt: new Date('2026-03-03T10:00:01.000Z'),
                    requestId: 'req-1',
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    } as any;

    const service = new OpsService(db, createConfigService());
    const result = await service.listCallbackEvents({ status: 'COMPLETED', limit: 25, offset: 5 });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.eventId).toBe('evt-1');
  });

  it('lists api request events with filters and summary', async () => {
    const selectMock = jest
      .fn()
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([
                  {
                    id: 'api-event-1',
                    userId: 'user-1',
                    requestId: 'req-1',
                    level: 'ERROR',
                    method: 'POST',
                    path: '/career-profiles',
                    statusCode: 500,
                    message: 'Something went wrong',
                    errorCode: 'INTERNAL_ERROR',
                    details: ['detail'],
                    meta: { retryable: true },
                    createdAt: new Date('2026-03-03T10:00:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 12 }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  { statusCode: 500, count: 7 },
                  { statusCode: 400, count: 5 },
                ]),
              }),
            }),
          }),
        }),
      });

    const db = {
      select: selectMock,
    } as any;

    const service = new OpsService(db, createConfigService());
    const result = await service.listApiRequestEvents({
      level: 'error',
      statusCode: 500,
      path: '/career',
      requestId: 'req-1',
      limit: 25,
      offset: 10,
    });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(10);
    expect(result.total).toBe(12);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.statusCode).toBe(500);
    expect(result.statusSummary).toEqual([
      { statusCode: 500, count: 7 },
      { statusCode: 400, count: 5 },
    ]);
  });

  it('reconciles stale running run to failed timeout', async () => {
    const now = new Date('2026-03-03T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-stale-1',
                      status: 'RUNNING',
                      lastHeartbeatAt: new Date('2026-03-03T10:00:00.000Z'),
                      createdAt: new Date('2026-03-03T09:00:00.000Z'),
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any;

    const service = new OpsService(
      db,
      createConfigService({
        SCRAPE_STALE_RUNNING_MINUTES: 60,
      }),
    );
    const result = await service.reconcileRun('run-stale-1');

    expect(result).toMatchObject({
      ok: true,
      status: 'FAILED',
      reconciled: true,
    });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('reconciles stale pending/running runs in bulk', async () => {
    const now = new Date('2026-03-03T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const selectMock = jest
      .fn()
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 'pending-1' }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 'running-1' }]),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 2 }]),
        }),
      });

    const db = {
      select: selectMock,
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any;

    const service = new OpsService(
      db,
      createConfigService({
        SCRAPE_STALE_PENDING_MINUTES: 15,
        SCRAPE_STALE_RUNNING_MINUTES: 60,
      }),
    );
    const result = await service.reconcileStaleRuns(24);

    expect(result).toMatchObject({
      ok: true,
      scanned: 2,
      reconciled: 2,
      failed: 0,
      reconciledInWindow: 2,
      windowHours: 24,
    });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});

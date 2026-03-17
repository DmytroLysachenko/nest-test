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
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 6 }]) }),
        }) // fresh catalog offers
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 5 }]) }),
        }) // catalog matched recently
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
    expect(result.catalog.freshAcceptedOffers).toBe(6);
    expect(result.catalog.matchedRecently).toBe(5);
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

  it('builds support overview bundle with recent failures', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    userId: 'user-1',
                    source: 'PRACUJ_PL',
                    status: 'FAILED',
                    failureType: 'timeout',
                    error: '[timeout] reconcile endpoint stale run',
                    lastHeartbeatAt: null,
                    finalizedAt: new Date('2026-03-13T10:00:00.000Z'),
                    createdAt: new Date('2026-03-13T09:00:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'callback-1',
                    sourceRunId: 'run-1',
                    eventId: 'evt-1',
                    requestId: 'req-1',
                    attemptNo: 1,
                    status: 'FAILED',
                    payloadHash: 'hash-1',
                    receivedAt: new Date('2026-03-13T10:01:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'api-1',
                    userId: 'user-1',
                    requestId: 'req-1',
                    level: 'ERROR',
                    method: 'POST',
                    path: '/api/job-sources/complete',
                    statusCode: 500,
                    message: 'Callback failed',
                    errorCode: 'CALLBACK_ERROR',
                    createdAt: new Date('2026-03-13T10:01:30.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'schedule-event-1',
                    scheduleId: 'schedule-1',
                    userId: 'user-1',
                    sourceRunId: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    requestId: 'req-1',
                    eventType: 'schedule_enqueue_failed',
                    severity: 'error',
                    code: 'INTERNAL_SCHEDULER',
                    message: 'Scheduler failed while enqueueing a due scrape run.',
                    createdAt: new Date('2026-03-13T10:02:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'schedule-1',
                    userId: 'user-1',
                    sourceRunId: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    requestId: 'req-1',
                    eventType: 'schedule_enqueue_failed',
                    severity: 'error',
                    message: 'Scheduler failed',
                    createdAt: new Date('2026-03-13T09:04:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'schedule-1',
                    userId: 'user-1',
                    sourceRunId: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    requestId: 'req-1',
                    eventType: 'schedule_enqueue_failed',
                    severity: 'error',
                    message: 'Scheduler failed',
                    createdAt: new Date('2026-03-13T09:04:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        }),
    } as any;

    const service = new OpsService(db, createConfigService({ JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: 24 }));
    jest.spyOn(service, 'getMetrics').mockResolvedValue({
      windowHours: 24,
      queue: { activeRuns: 0, pendingRuns: 0, runningRuns: 0, runningWithoutHeartbeat: 0 },
      scrape: { totalRuns: 0, completedRuns: 0, failedRuns: 0, successRate: 0 },
      offers: { totalUserOffers: 0, unscoredUserOffers: 0 },
      catalog: { freshAcceptedOffers: 0, matchedRecently: 0 },
      lifecycle: { staleReconciledRuns: 0, retriesTriggered: 0, retrySuccessRate: 0 },
      callback: {
        totalEvents: 0,
        completedEvents: 0,
        failedEvents: 0,
        failedRate: 0,
        failuresByType: {},
        failuresByCode: {},
        retryRate24h: 0,
        conflictingPayloadEvents24h: 0,
      },
      scheduler: { lastTriggerAt: null, dueSchedules: 0, enqueueFailures24h: 0 },
    });
    const result = await service.getSupportOverview();

    expect(result.recentFailures.scrapeRuns[0]?.id).toBe('run-1');
    expect(result.recentFailures.callbackEvents[0]?.id).toBe('callback-1');
    expect(result.recentFailures.apiRequests[0]?.id).toBe('api-1');
    expect(result.recentFailures.scheduleExecutions[0]?.id).toBe('schedule-event-1');
  });

  it('builds scrape incident bundle with timeline and correlated request events', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (cb: (rows: unknown[]) => unknown) =>
                  Promise.resolve(
                    cb([
                      {
                        id: 'run-1',
                        traceId: '11111111-1111-4111-8111-111111111111',
                        source: 'PRACUJ_PL',
                        userId: 'user-1',
                        listingUrl: 'https://example.com',
                        filters: { keywords: 'frontend' },
                        status: 'FAILED',
                        failureType: 'timeout',
                        error: '[timeout] reconcile endpoint stale run',
                        totalFound: null,
                        scrapedCount: null,
                        lastHeartbeatAt: null,
                        startedAt: null,
                        completedAt: null,
                        finalizedAt: new Date('2026-03-13T10:00:00.000Z'),
                        createdAt: new Date('2026-03-13T09:00:00.000Z'),
                      },
                    ]),
                  ),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'timeline-1',
                    eventType: 'worker.accepted',
                    severity: 'info',
                    requestId: 'req-1',
                    phase: 'accepted',
                    attemptNo: 1,
                    code: 'WORKER_ACCEPTED',
                    message: 'Worker accepted',
                    meta: null,
                    createdAt: new Date('2026-03-13T09:00:30.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'callback-1',
                    eventId: 'evt-1',
                    requestId: 'req-1',
                    attemptNo: 1,
                    status: 'FAILED',
                    payloadHash: 'hash-1',
                    emittedAt: new Date('2026-03-13T09:05:00.000Z'),
                    receivedAt: new Date('2026-03-13T09:05:02.000Z'),
                    payload: JSON.stringify({
                      failureType: 'timeout',
                      traceId: '11111111-1111-4111-8111-111111111111',
                    }),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'api-1',
                    userId: 'user-1',
                    requestId: 'req-1',
                    level: 'ERROR',
                    method: 'POST',
                    path: '/api/job-sources/complete',
                    statusCode: 500,
                    message: 'Callback failed',
                    errorCode: 'CALLBACK_ERROR',
                    details: null,
                    meta: { traceId: '11111111-1111-4111-8111-111111111111' },
                    createdAt: new Date('2026-03-13T09:05:03.000Z'),
                  },
                ]),
              }),
            }),
          }),
        }),
    } as any;

    const service = new OpsService(db, createConfigService());
    const result = await service.getSupportScrapeIncident('run-1');

    expect(result.run.id).toBe('run-1');
    expect(result.timeline).toHaveLength(1);
    expect(result.callbackEvents).toHaveLength(1);
    expect(result.apiRequestEvents[0]?.requestId).toBe('req-1');
    expect(result.signals.likelyFailureStage).toBe('worker-not-started-or-heartbeat-missing');
  });

  it('correlates support artifacts across request, trace, run, and user ids', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    userId: 'user-1',
                    status: 'FAILED',
                    failureType: 'timeout',
                    error: 'stale',
                    createdAt: new Date('2026-03-13T09:00:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'timeline-1',
                    sourceRunId: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    requestId: 'req-1',
                    message: 'Worker accepted',
                    eventType: 'worker.accepted',
                    severity: 'info',
                    createdAt: new Date('2026-03-13T09:00:30.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'schedule-1',
                    userId: 'user-1',
                    sourceRunId: 'run-1',
                    traceId: '11111111-1111-4111-8111-111111111111',
                    requestId: 'req-1',
                    eventType: 'schedule_enqueue_failed',
                    severity: 'error',
                    message: 'Scheduler failed',
                    createdAt: new Date('2026-03-13T09:04:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'callback-1',
                    sourceRunId: 'run-1',
                    requestId: 'req-1',
                    eventId: 'evt-1',
                    status: 'FAILED',
                    attemptNo: 1,
                    receivedAt: new Date('2026-03-13T09:05:02.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'api-1',
                    userId: 'user-1',
                    requestId: 'req-1',
                    level: 'ERROR',
                    path: '/api/job-sources/complete',
                    statusCode: 500,
                    message: 'Callback failed',
                    createdAt: new Date('2026-03-13T09:05:03.000Z'),
                  },
                ]),
              }),
            }),
          }),
        }),
    } as any;

    const service = new OpsService(db, createConfigService());
    const result = await service.correlateSupport({
      requestId: 'req-1',
      traceId: '11111111-1111-4111-8111-111111111111',
      sourceRunId: 'run-1',
      userId: 'user-1',
    });

    expect(result.matches.map((item) => item.kind)).toEqual([
      'api-request-event',
      'callback-event',
      'schedule-event',
      'scrape-run-event',
      'scrape-run',
    ]);
  });
});

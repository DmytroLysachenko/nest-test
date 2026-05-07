import { JobSourcesService } from './job-sources.service';

const createService = () => {
  const configService = {
    get: jest.fn(),
  } as any;

  const logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  } as any;

  const service = new JobSourcesService(configService, logger, db);
  return { service, db };
};

describe('JobSourcesService schedule terminal status sync', () => {
  it('syncs linked schedule row and event when a scheduled run completes', async () => {
    const { service, db } = createService();
    const runWhere = jest.fn();
    const runReturning = jest.fn().mockResolvedValue([{ id: 'run-1' }]);
    runWhere.mockReturnValue({ returning: runReturning });

    const scheduleWhere = jest.fn().mockResolvedValue(undefined);

    db.update
      .mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: runWhere,
        }),
      })
      .mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: scheduleWhere,
        }),
      });

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: Array<Record<string, unknown>>) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      scheduleId: 'schedule-1',
                      userId: 'user-1',
                      traceId: 'trace-1',
                      requestId: 'request-1',
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
    });

    const insertValues = jest.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValue({
      values: insertValues,
    });

    const finalizedAt = new Date('2026-05-06T10:00:00.000Z');
    const transitioned = await (service as any).transitionRunStatus('run-1', 'RUNNING', 'COMPLETED', {
      finalizedAt,
      completedAt: finalizedAt,
      classifiedOutcome: 'completed_with_matches',
      error: null,
    });

    expect(transitioned).toBe(true);
    expect(scheduleWhere).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        userId: 'user-1',
        sourceRunId: 'run-1',
        eventType: 'schedule_run_completed',
        code: 'COMPLETED',
      }),
    );
  });

  it('records failed terminal outcome for linked scheduled runs', async () => {
    const { service, db } = createService();
    const runWhere = jest.fn();
    const runReturning = jest.fn().mockResolvedValue([{ id: 'run-2' }]);
    runWhere.mockReturnValue({ returning: runReturning });

    const scheduleSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });

    db.update
      .mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: runWhere,
        }),
      })
      .mockReturnValueOnce({
        set: scheduleSet,
      });

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: Array<Record<string, unknown>>) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      scheduleId: 'schedule-2',
                      userId: 'user-2',
                      traceId: 'trace-2',
                      requestId: 'request-2',
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
    });

    const insertValues = jest.fn().mockResolvedValue(undefined);
    db.insert.mockReturnValue({
      values: insertValues,
    });

    const finalizedAt = new Date('2026-05-06T11:00:00.000Z');
    await (service as any).transitionRunStatus('run-2', 'RUNNING', 'FAILED', {
      finalizedAt,
      completedAt: finalizedAt,
      classifiedOutcome: 'worker_timeout',
      error: 'worker timed out',
    });

    expect(scheduleSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastRunStatus: 'FAILED',
        updatedAt: finalizedAt,
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-2',
        sourceRunId: 'run-2',
        eventType: 'schedule_run_failed',
        severity: 'error',
        code: 'FAILED',
      }),
    );
  });

  it('skips schedule sync when the run was not started by a schedule', async () => {
    const { service, db } = createService();
    const runWhere = jest.fn();
    const runReturning = jest.fn().mockResolvedValue([{ id: 'run-3' }]);
    runWhere.mockReturnValue({ returning: runReturning });

    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: runWhere,
      }),
    });

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: Array<Record<string, unknown>>) => unknown) => Promise.resolve(cb([])),
            }),
          }),
        }),
      }),
    });

    db.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    await (service as any).transitionRunStatus('run-3', 'RUNNING', 'COMPLETED', {
      finalizedAt: new Date('2026-05-06T12:00:00.000Z'),
      completedAt: new Date('2026-05-06T12:00:00.000Z'),
      classifiedOutcome: 'completed_with_matches',
      error: null,
    });

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});

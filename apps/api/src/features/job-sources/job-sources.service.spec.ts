import { jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { JobSourcesService } from './job-sources.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => overrides[key]),
  }) as any;

const createLogger = () =>
  ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }) as any;

describe('JobSourcesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns accepted scrape response with sourceRunId', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'profile-id' }]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceRunsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([
                { id: 'run-uuid', createdAt: new Date('2026-02-12T00:00:00.000Z') },
              ]),
            }),
          };
        }
        throw new Error('Unexpected insert table');
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any;

    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as any);

    const service = new JobSourcesService(
      createConfigService({
        WORKER_TASK_URL: 'http://localhost:4001/tasks',
        WORKER_REQUEST_TIMEOUT_MS: 5000,
      }),
      createLogger(),
      db,
    );

    const result = await service.enqueueScrape(
      'user-id',
      {
        source: 'pracuj-pl',
        filters: { keywords: 'react' },
        limit: 10,
      },
      'request-id',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.sourceRunId).toBe('run-uuid');
    expect(result.status).toBe('accepted');
  });

  it('handles failed callback without creating user offers', async () => {
    const updatePayloads: Array<Record<string, unknown>> = [];
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
                        userId: 'user-1',
                        careerProfileId: 'profile-1',
                        status: 'RUNNING',
                        totalFound: null,
                        scrapedCount: null,
                      },
                    ]),
                  ),
              }),
            }),
          }),
        }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((values: Record<string, unknown>) => {
          updatePayloads.push(values);
          return { where: jest.fn().mockResolvedValue(undefined) };
        }),
      }),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-1',
      status: 'FAILED',
      error: 'Cloudflare blocked',
      scrapedCount: 0,
      totalFound: 42,
    });

    expect(result).toMatchObject({ ok: true, status: 'FAILED', inserted: 0 });
    expect(db.insert).not.toHaveBeenCalled();
    expect(updatePayloads.at(-1)?.status).toBe('FAILED');
  });

  it('handles completed callback idempotently when offers already materialized', async () => {
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
                        id: 'run-2',
                        userId: 'user-2',
                        careerProfileId: 'profile-2',
                        status: 'COMPLETED',
                        totalFound: 3,
                        scrapedCount: 3,
                      },
                    ]),
                  ),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 'offer-1' }, { id: 'offer-2' }]),
          }),
        }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table !== userJobOffersTable) {
          throw new Error('Unexpected insert table');
        }
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoNothing: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        };
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-2',
      status: 'COMPLETED',
      scrapedCount: 2,
      totalFound: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 0,
      totalOffers: 2,
      idempotent: true,
    });
  });

  it('does not downgrade finalized run state when callback status conflicts', async () => {
    const db = {
      select: jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-4',
                      userId: 'user-4',
                      careerProfileId: 'profile-4',
                      status: 'COMPLETED',
                      totalFound: 3,
                      scrapedCount: 3,
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-4',
      status: 'FAILED',
      error: 'late failure callback',
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 0,
      idempotent: true,
    });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('handles completed callback and inserts new user offers', async () => {
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
                        id: 'run-3',
                        userId: 'user-3',
                        careerProfileId: 'profile-3',
                        status: 'RUNNING',
                        totalFound: 2,
                        scrapedCount: 1,
                      },
                    ]),
                  ),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 'offer-11' }]),
          }),
        }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table !== userJobOffersTable) {
          throw new Error('Unexpected insert table');
        }
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoNothing: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'ujo-1' }]),
            }),
          }),
        };
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-3',
      status: 'COMPLETED',
      scrapedCount: 1,
      totalFound: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 1,
      totalOffers: 1,
      idempotent: false,
    });
  });
});

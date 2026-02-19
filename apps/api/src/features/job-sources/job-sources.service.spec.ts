import { jobOffersTable, jobSourceCallbackEventsTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';

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
        forceRefresh: true,
      },
      'request-id',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.sourceRunId).toBe('run-uuid');
    expect(result.status).toBe('accepted');
  });

  it('reuses completed run offers from db before enqueueing worker scrape', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([{ id: 'profile-id' }]),
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
                    id: 'cached-run-1',
                    listingUrl: 'https://it.pracuj.pl/praca/frontend%20developer;kw',
                    filters: { keywords: 'frontend developer' },
                    completedAt: new Date(),
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
                limit: jest.fn().mockResolvedValue([{ id: 'offer-1' }, { id: 'offer-2' }]),
              }),
            }),
          }),
        }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceRunsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([
                { id: 'reused-run-uuid', createdAt: new Date('2026-02-20T00:00:00.000Z') },
              ]),
            }),
          };
        }

        if (table === userJobOffersTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 'ujo-1' }, { id: 'ujo-2' }]),
              }),
            }),
          };
        }

        throw new Error('Unexpected insert table');
      }),
      update: jest.fn(),
    } as any;

    const fetchMock = jest.spyOn(global, 'fetch' as any);
    const service = new JobSourcesService(
      createConfigService({
        SCRAPE_DB_REUSE_HOURS: 24,
      }),
      createLogger(),
      db,
    );

    const result = await service.enqueueScrape(
      'user-id',
      {
        source: 'pracuj-pl-it',
        filters: { keywords: 'frontend developer' },
        limit: 10,
      },
      'request-id',
    );

    expect(result).toMatchObject({
      ok: true,
      sourceRunId: 'reused-run-uuid',
      status: 'reused',
      inserted: 2,
      totalOffers: 2,
      reusedFromRunId: 'cached-run-1',
    });
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('short-circuits repeated completed callback idempotently', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
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
        }),
      update: jest.fn(),
      insert: jest.fn(),
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
      idempotent: true,
    });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
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

  it('upserts job_offers when completed callback contains jobs payload', async () => {
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
                        id: 'run-5',
                        source: 'PRACUJ_PL',
                        userId: 'user-5',
                        careerProfileId: 'profile-5',
                        status: 'RUNNING',
                        totalFound: null,
                        scrapedCount: null,
                      },
                    ]),
                  ),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 'offer-51' }]),
          }),
        }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobOffersTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
            }),
          };
        }
        if (table === userJobOffersTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 'ujo-51' }]),
              }),
            }),
          };
        }
        throw new Error('Unexpected insert table');
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-5',
      status: 'COMPLETED',
      jobs: [
        {
          url: 'https://it.pracuj.pl/praca/test,oferta,123',
          title: 'Frontend Developer',
          description: 'React + TypeScript',
          sourceId: '123',
        },
      ],
      scrapedCount: 1,
      totalFound: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 1,
      totalOffers: 1,
    });
    expect(db.insert).toHaveBeenCalledWith(jobOffersTable);
  });

  it('rejects failed callback without error details', async () => {
    const db = {
      select: jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-6',
                      source: 'PRACUJ_PL',
                      userId: 'user-6',
                      careerProfileId: 'profile-6',
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
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);

    await expect(
      service.completeScrape({
        sourceRunId: 'run-6',
        status: 'FAILED',
      }),
    ).rejects.toThrow('Failed callback must include error');
  });

  it('rejects completed callback when scrapedCount mismatches jobs payload length', async () => {
    const db = {
      select: jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-7',
                      source: 'PRACUJ_PL',
                      userId: 'user-7',
                      careerProfileId: 'profile-7',
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
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);

    await expect(
      service.completeScrape({
        sourceRunId: 'run-7',
        status: 'COMPLETED',
        scrapedCount: 5,
        jobs: [
          {
            url: 'https://it.pracuj.pl/praca/test,oferta,777',
            title: 'Backend Developer',
            description: 'TypeScript + NestJS',
          },
        ],
      }),
    ).rejects.toThrow('scrapedCount must match jobs payload length');
  });

  it('rejects callback when signature secret is configured but signature headers are missing', async () => {
    const db = {
      select: jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-8',
                      source: 'PRACUJ_PL',
                      userId: 'user-8',
                      careerProfileId: 'profile-8',
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
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(
      createConfigService({
        WORKER_CALLBACK_SIGNING_SECRET: 'secret',
        WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC: 300,
      }),
      createLogger(),
      db,
    );

    await expect(
      service.completeScrape(
        {
          sourceRunId: 'run-8',
          status: 'FAILED',
          error: 'network',
        },
        undefined,
        'request-1',
        undefined,
        undefined,
      ),
    ).rejects.toThrow('Missing worker callback signature headers');
  });

  it('ignores duplicate callback event idempotently', async () => {
    const db = {
      select: jest.fn().mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-9',
                      source: 'PRACUJ_PL',
                      userId: 'user-9',
                      careerProfileId: 'profile-9',
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
      update: jest.fn(),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceCallbackEventsTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        throw new Error('Unexpected insert table');
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-9',
      eventId: 'event-9',
      status: 'COMPLETED',
      scrapedCount: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'RUNNING',
      inserted: 0,
      idempotent: true,
    });
    expect(db.update).not.toHaveBeenCalled();
  });
});

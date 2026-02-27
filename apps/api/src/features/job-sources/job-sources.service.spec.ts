import { jobOffersTable, jobSourceCallbackEventsTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { JobSourcesService } from './job-sources.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => {
      if (key in overrides) {
        return overrides[key];
      }
      if (key === 'SCRAPE_STALE_PENDING_MINUTES') {
        return 15;
      }
      if (key === 'SCRAPE_STALE_RUNNING_MINUTES') {
        return 60;
      }
      return undefined;
    }),
  }) as any;

const createLogger = () =>
  ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }) as any;

const candidateProfileFixture = {
  schemaVersion: '1.0.0',
  candidateCore: {
    headline: 'Frontend Developer',
    summary: 'Frontend profile',
    seniority: { primary: 'senior', secondary: [] },
    languages: [],
  },
  targetRoles: [{ title: 'Frontend Developer', confidenceScore: 0.9, confidenceLevel: 'high', priority: 1 }],
  competencies: [
    {
      name: 'React',
      type: 'technology',
      confidenceScore: 0.9,
      confidenceLevel: 'high',
      importance: 'high',
      evidence: ['project'],
      isTransferable: false,
    },
    {
      name: 'TypeScript',
      type: 'technology',
      confidenceScore: 0.9,
      confidenceLevel: 'high',
      importance: 'high',
      evidence: ['project'],
      isTransferable: false,
    },
    {
      name: 'JavaScript',
      type: 'technology',
      confidenceScore: 0.88,
      confidenceLevel: 'high',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: false,
    },
    {
      name: 'HTML',
      type: 'technology',
      confidenceScore: 0.85,
      confidenceLevel: 'high',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: false,
    },
    {
      name: 'CSS',
      type: 'technology',
      confidenceScore: 0.84,
      confidenceLevel: 'high',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: false,
    },
    {
      name: 'Git',
      type: 'tool',
      confidenceScore: 0.8,
      confidenceLevel: 'medium',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: true,
    },
    {
      name: 'REST API',
      type: 'methodology',
      confidenceScore: 0.78,
      confidenceLevel: 'medium',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: true,
    },
    {
      name: 'Testing',
      type: 'methodology',
      confidenceScore: 0.76,
      confidenceLevel: 'medium',
      importance: 'medium',
      evidence: ['project'],
      isTransferable: true,
    },
  ],
  workPreferences: {
    hardConstraints: {
      workModes: ['remote'],
      employmentTypes: ['b2b'],
      locations: [{ city: 'Gdynia', radiusKm: 20, country: 'PL' }],
      minSalary: { amount: 18000, currency: 'PLN', period: 'month' },
      noPolishRequired: false,
      onlyEmployerOffers: false,
      onlyWithProjectDescription: false,
    },
    softPreferences: {
      workModes: [],
      employmentTypes: [],
      locations: [],
    },
  },
  searchSignals: {
    keywords: [
      { value: 'Frontend Developer', weight: 1 },
      { value: 'React', weight: 1 },
      { value: 'TypeScript', weight: 1 },
      { value: 'JavaScript', weight: 0.9 },
      { value: 'HTML', weight: 0.8 },
      { value: 'CSS', weight: 0.8 },
      { value: 'UI', weight: 0.7 },
      { value: 'SPA', weight: 0.7 },
      { value: 'Web', weight: 0.6 },
      { value: 'Git', weight: 0.6 },
      { value: 'REST API', weight: 0.6 },
      { value: 'Testing', weight: 0.6 },
    ],
    specializations: [{ value: 'frontend', weight: 1 }],
    technologies: [
      { value: 'react', weight: 1 },
      { value: 'typescript', weight: 1 },
      { value: 'javascript', weight: 0.9 },
      { value: 'html', weight: 0.8 },
      { value: 'css', weight: 0.8 },
      { value: 'git', weight: 0.6 },
    ],
  },
  riskAndGrowth: {
    gaps: [],
    growthDirections: [],
    transferableStrengths: [],
  },
};

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
              limit: jest.fn().mockResolvedValue([
                {
                  careerProfileId: 'profile-id',
                  contentJson: candidateProfileFixture,
                },
              ]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceRunsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest
                .fn()
                .mockResolvedValue([{ id: 'run-uuid', createdAt: new Date('2026-02-12T00:00:00.000Z') }]),
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

  it('rejects enqueue when user already has too many active runs', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    careerProfileId: 'profile-id',
                    contentJson: candidateProfileFixture,
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ value: 2 }]),
          }),
        }),
      insert: jest.fn(),
      update: jest.fn(),
    } as any;

    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as any);

    const service = new JobSourcesService(
      createConfigService({
        SCRAPE_MAX_ACTIVE_RUNS_PER_USER: 2,
      }),
      createLogger(),
      db,
    );

    await expect(
      service.enqueueScrape(
        'user-id',
        {
          source: 'pracuj-pl',
          filters: { keywords: 'react' },
          limit: 10,
        },
        'request-id',
      ),
    ).rejects.toThrow('Too many active scrape runs');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects listingUrl outside source allowlist', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  careerProfileId: 'profile-id',
                  contentJson: candidateProfileFixture,
                },
              ]),
            }),
          }),
        }),
      }),
      insert: jest.fn(),
      update: jest.fn(),
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

    await expect(
      service.enqueueScrape(
        'user-id',
        {
          source: 'pracuj-pl',
          listingUrl: 'https://example.com/jobs',
          limit: 10,
          forceRefresh: true,
        },
        'request-id',
      ),
    ).rejects.toThrow('listingUrl host is not allowed for this source');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('synthesizes scrape source and filters from active profile when request omits them', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  careerProfileId: 'profile-id',
                  contentJson: candidateProfileFixture,
                },
              ]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceRunsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest
                .fn()
                .mockResolvedValue([{ id: 'run-uuid-derived', createdAt: new Date('2026-02-12T00:00:00.000Z') }]),
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
        limit: 10,
        forceRefresh: true,
      },
      'request-id',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.source).toBe('pracuj-pl-it');
    expect(body.filters).toMatchObject({
      specializations: ['frontend'],
      workModes: ['home-office'],
      contractTypes: ['3'],
      salaryMin: 18000,
      location: 'Gdynia',
      radiusKm: 20,
    });
    expect(result.resolvedFromProfile).toBe(true);
    expect(result.intentFingerprint).toBeDefined();
  });

  it('reuses completed run offers from db before enqueueing worker scrape', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    careerProfileId: 'profile-id',
                    contentJson: candidateProfileFixture,
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
              returning: jest
                .fn()
                .mockResolvedValue([{ id: 'reused-run-uuid', createdAt: new Date('2026-02-20T00:00:00.000Z') }]),
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
      select: jest.fn().mockReturnValueOnce({
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
            where: jest.fn().mockResolvedValue([]),
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

  it('returns run diagnostics from latest callback event payload', async () => {
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
                        id: 'run-10',
                        source: 'PRACUJ_PL',
                        userId: 'user-10',
                        status: 'COMPLETED',
                        listingUrl: 'https://it.pracuj.pl/praca?its=frontend',
                        totalFound: 12,
                        scrapedCount: 4,
                        completedAt: new Date('2026-02-21T00:00:00.000Z'),
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
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) =>
                    Promise.resolve(
                      cb([
                        {
                          payload: JSON.stringify({
                            diagnostics: {
                              relaxationTrail: ['drop.keyword'],
                              blockedUrls: ['https://it.pracuj.pl/x'],
                              hadZeroOffersStep: true,
                              pagesVisited: 3,
                              jobLinksDiscovered: 12,
                              blockedPages: 1,
                            },
                          }),
                        },
                      ]),
                    ),
                }),
              }),
            }),
          }),
        }),
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const diagnostics = await service.getRunDiagnostics('user-10', 'run-10');

    expect(diagnostics.runId).toBe('run-10');
    expect(diagnostics.diagnostics.relaxationTrail).toEqual(['drop.keyword']);
    expect(diagnostics.diagnostics.hadZeroOffersStep).toBe(true);
    expect(diagnostics.diagnostics.stats.jobLinksDiscovered).toBe(12);
  });

  it('returns aggregated diagnostics summary for recent runs', async () => {
    const now = new Date('2026-02-26T10:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              status: 'COMPLETED',
              error: null,
              totalFound: 10,
              scrapedCount: 8,
              startedAt: new Date('2026-02-26T08:00:00.000Z'),
              completedAt: new Date('2026-02-26T08:02:00.000Z'),
            },
            {
              status: 'FAILED',
              error: '[timeout] worker timeout',
              totalFound: 0,
              scrapedCount: 0,
              startedAt: new Date('2026-02-26T09:00:00.000Z'),
              completedAt: new Date('2026-02-26T09:05:00.000Z'),
            },
            {
              status: 'RUNNING',
              error: null,
              totalFound: null,
              scrapedCount: null,
              startedAt: new Date('2026-02-26T09:30:00.000Z'),
              completedAt: null,
            },
          ]),
        }),
      }),
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(
      createConfigService({
        JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: 48,
      }),
      createLogger(),
      db,
    );
    const summary = await service.getRunDiagnosticsSummary('user-11');

    expect(summary.windowHours).toBe(48);
    expect(summary.status.total).toBe(3);
    expect(summary.status.completed).toBe(1);
    expect(summary.status.failed).toBe(1);
    expect(summary.status.running).toBe(1);
    expect(summary.performance.avgDurationMs).toBe(210000);
    expect(summary.failures.timeout).toBe(1);
  });

  it('optionally includes timeline buckets in diagnostics summary', async () => {
    const now = new Date('2026-02-26T10:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              status: 'COMPLETED',
              error: null,
              totalFound: 5,
              scrapedCount: 4,
              startedAt: new Date('2026-02-26T08:00:00.000Z'),
              completedAt: new Date('2026-02-26T08:04:00.000Z'),
            },
            {
              status: 'FAILED',
              error: '[network] blocked',
              totalFound: 0,
              scrapedCount: 0,
              startedAt: new Date('2026-02-26T08:30:00.000Z'),
              completedAt: new Date('2026-02-26T08:35:00.000Z'),
            },
          ]),
        }),
      }),
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(
      createConfigService({
        JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: 24,
      }),
      createLogger(),
      db,
    );
    const summary = await service.getRunDiagnosticsSummary('user-12', 24, 'hour', true);

    expect(summary.timeline).toBeDefined();
    expect(summary.timeline).toHaveLength(1);
    expect(summary.timeline?.[0]?.bucketStart).toBe('2026-02-26T08:00:00.000Z');
    expect(summary.timeline?.[0]?.total).toBe(2);
    expect(summary.timeline?.[0]?.successRate).toBe(0.5);
  });

  it('marks stale pending/running runs as failed before listing', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: updateWhere,
        }),
      }),
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ total: 0 }]),
          }),
        }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    await service.listRuns('user-13', {});

    expect(db.update).toHaveBeenCalledTimes(2);
    expect(updateWhere).toHaveBeenCalledTimes(2);
  });

  it('rejects retry when run is not failed', async () => {
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-1',
                      source: 'PRACUJ_PL',
                      listingUrl: 'https://it.pracuj.pl/praca',
                      filters: null,
                      status: 'COMPLETED',
                      careerProfileId: 'profile-1',
                      retryCount: 0,
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    await expect(service.retryRun('user-14', 'run-1')).rejects.toThrow('Only failed runs can be retried');
  });
});

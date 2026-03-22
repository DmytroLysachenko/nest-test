import { CloudTasksClient } from '@google-cloud/tasks';
import { jobOffersTable, jobSourceCallbackEventsTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';
import { OAuth2Client } from 'google-auth-library';
import { PgDialect } from 'drizzle-orm/pg-core';

import * as candidateMatcher from '@/features/job-matching/candidate-matcher';

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
              returning: jest.fn().mockResolvedValue([
                {
                  id: 'run-uuid',
                  traceId: '11111111-1111-4111-8111-111111111111',
                  createdAt: new Date('2026-02-12T00:00:00.000Z'),
                },
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
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.taskSchemaVersion).toBe('1');
    expect(typeof body.dedupeKey).toBe('string');
    expect(body.traceId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.sourceRunId).toBe('run-uuid');
    expect(result.traceId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.status).toBe('accepted');
    expect(result.taskSchemaVersion).toBe('1');
  });

  it('enqueues scrape via Cloud Tasks provider and skips direct worker fetch', async () => {
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
                .mockResolvedValue([{ id: 'run-cloud-task-uuid', createdAt: new Date('2026-02-12T00:00:00.000Z') }]),
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

    const queuePathMock = jest
      .spyOn(CloudTasksClient.prototype, 'queuePath')
      .mockReturnValue('projects/test/locations/us-central1/queues/scrape-jobs');
    const createTaskMock = jest
      .spyOn(CloudTasksClient.prototype, 'createTask')
      .mockImplementation(
        async () => [{ name: 'projects/test/locations/us-central1/queues/scrape-jobs/tasks/task-123' }] as any,
      );
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as any);

    const service = new JobSourcesService(
      createConfigService({
        WORKER_TASK_PROVIDER: 'cloud-tasks',
        WORKER_TASK_URL: 'https://worker.example.com/tasks',
        WORKER_TASKS_PROJECT_ID: 'test',
        WORKER_TASKS_LOCATION: 'us-central1',
        WORKER_TASKS_QUEUE: 'scrape-jobs',
        WORKER_TASKS_SERVICE_ACCOUNT_EMAIL: 'worker@example.iam.gserviceaccount.com',
        WORKER_TASKS_OIDC_AUDIENCE: 'https://worker.example.com/tasks',
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

    expect(queuePathMock).toHaveBeenCalledWith('test', 'us-central1', 'scrape-jobs');
    expect(createTaskMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      sourceRunId: 'run-cloud-task-uuid',
      status: 'accepted',
      provider: 'cloud-tasks',
      taskName: 'projects/test/locations/us-central1/queues/scrape-jobs/tasks/task-123',
      taskId: 'task-123',
      taskSchemaVersion: '1',
    });
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

  it('rejects enqueue when user reached daily scrape budget', async () => {
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
            where: jest.fn().mockResolvedValue([{ value: 3 }]),
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
        SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER: 3,
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
    ).rejects.toThrow('Daily scrape limit reached');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('suppresses duplicate enqueue for same user intent within idempotency window', async () => {
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
              returning: jest.fn().mockResolvedValue([{ id: 'run-dup-1', createdAt: new Date() }]),
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
        SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC: 60,
      }),
      createLogger(),
      db,
    );

    await service.enqueueScrape(
      'user-id',
      { source: 'pracuj-pl', filters: { keywords: 'react' }, limit: 10, forceRefresh: true },
      'request-id-1',
    );

    await expect(
      service.enqueueScrape(
        'user-id',
        { source: 'pracuj-pl', filters: { keywords: 'react' }, limit: 10, forceRefresh: true },
        'request-id-2',
      ),
    ).rejects.toThrow('Duplicate scrape enqueue detected');
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it('returns user-facing blocker and warning details in scrape preflight', async () => {
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
            where: jest.fn().mockResolvedValue([{ value: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ value: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (cb: (rows: unknown[]) => unknown) =>
                  Promise.resolve(
                    cb([
                      {
                        enabled: 1,
                        cron: '0 9 * * *',
                        timezone: 'Europe/Warsaw',
                        source: 'pracuj-pl-it',
                        limit: 20,
                        careerProfileId: null,
                        filters: null,
                        lastTriggeredAt: new Date('2026-03-08T09:00:00.000Z'),
                        nextRunAt: new Date('2026-03-10T09:00:00.000Z'),
                        lastRunStatus: 'COMPLETED',
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
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(
      createConfigService({
        SCRAPE_MAX_ACTIVE_RUNS_PER_USER: 2,
        SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER: 3,
      }),
      createLogger(),
      db,
    );
    jest.spyOn(service as any, 'countCatalogMatchesForProfile').mockResolvedValue(0);
    jest.spyOn(service as any, 'getSourceAutomationBackoff').mockResolvedValue({
      active: false,
      pausedUntil: null,
      failedRuns: 0,
      totalRunsConsidered: 0,
      recentFailureTypes: [],
    });

    const result = await service.getPreflight('user-1', { limit: 20 });

    expect(result.ready).toBe(true);
    expect(result.warningDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'daily-budget-nearly-exhausted' }),
        expect.objectContaining({ code: 'using-profile-derived-filters' }),
      ]),
    );
    expect(result.guidance).toContain('Review the warnings below');
    expect(result.schedule).toEqual(
      expect.objectContaining({
        enabled: true,
        source: 'pracuj-pl-it',
        lastRunStatus: 'COMPLETED',
      }),
    );
  });

  it('serves scrape requests from fresh catalog rematch before enqueueing the worker', async () => {
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

    const fetchMock = jest.spyOn(global, 'fetch' as any);
    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    jest.spyOn(service as any, 'tryServeFromCatalog').mockResolvedValue({
      ok: true,
      sourceRunId: 'catalog-run-1',
      traceId: 'catalog-trace-1',
      acceptedAt: '2026-03-16T10:00:00.000Z',
      inserted: 3,
      totalOffers: 3,
      matchedOffers: 3,
      status: 'reused',
    });

    const result = await service.enqueueScrape(
      'user-id',
      {
        source: 'pracuj-pl-it',
        filters: { keywords: 'frontend developer' },
        limit: 3,
      },
      'request-id',
    );

    expect(result).toMatchObject({
      ok: true,
      status: 'reused',
      sourceRunId: 'catalog-run-1',
      inserted: 3,
      totalOffers: 3,
      rematchedFromCatalog: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks scheduled enqueue when source-health backoff is active', async () => {
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

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    jest.spyOn(service as any, 'getSourceAutomationBackoff').mockResolvedValue({
      active: true,
      pausedUntil: new Date('2026-03-16T11:00:00.000Z'),
      failedRuns: 3,
      totalRunsConsidered: 5,
      recentFailureTypes: ['parse', 'network', 'callback'],
    });

    await expect(
      (service as any).enqueueScrape(
        'user-id',
        {
          source: 'pracuj-pl-it',
          filters: { keywords: 'frontend developer' },
          limit: 10,
        },
        'request-id',
        'scheduled',
      ),
    ).rejects.toThrow('Automation paused for PRACUJ_PL');
    expect(db.insert).not.toHaveBeenCalled();
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
    jest.spyOn(service as any, 'tryServeFromCatalog').mockResolvedValue(null);
    jest.spyOn(service as any, 'tryReuseFromDatabase').mockResolvedValue({
      sourceRunId: 'reused-run-uuid',
      traceId: 'reuse-trace-id',
      acceptedAt: '2026-02-20T00:00:00.000Z',
      inserted: 2,
      totalOffers: 2,
      reusedFromRunId: 'cached-run-1',
    });

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
    expect(db.insert).not.toHaveBeenCalledWith(userJobOffersTable);
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
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
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
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
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
    const updateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
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
        set: updateSet,
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
    jest.spyOn(service as any, 'getCareerProfileContext').mockResolvedValue({
      careerProfileId: 'profile-3',
      profile: candidateProfileFixture,
    });
    jest.spyOn(service as any, 'linkCatalogOffersToUser').mockResolvedValue({
      insertedCount: 1,
      totalCandidateCount: 1,
      matchedCount: 1,
    });
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
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: expect.objectContaining({
          candidateOffers: 1,
          matchedOffers: 1,
          userInsertedOffers: 1,
          callbackAcceptedAt: expect.any(String),
        }),
      }),
    );
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
              onConflictDoUpdate: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 'offer-51' }]),
              }),
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
    jest.spyOn(service as any, 'getCareerProfileContext').mockResolvedValue({
      careerProfileId: 'profile-5',
      profile: candidateProfileFixture,
    });
    jest.spyOn(service as any, 'linkCatalogOffersToUser').mockResolvedValue({
      insertedCount: 1,
      totalCandidateCount: 1,
      matchedCount: 1,
    });
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
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
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
      reasonCode: 'DUPLICATE_EVENT_ID',
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects callback event when payload hash conflicts for same event id', async () => {
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
                        careerProfileId: 'profile-10',
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
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (cb: (rows: unknown[]) => unknown) =>
                  Promise.resolve(
                    cb([
                      {
                        id: 'event-row-1',
                        payloadHash: 'abc123',
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
      sourceRunId: 'run-10',
      eventId: 'event-10',
      attemptNo: 2,
      payloadHash: 'different-hash',
      status: 'COMPLETED',
      scrapedCount: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'RUNNING',
      inserted: 0,
      idempotent: true,
      reasonCode: 'CONFLICTING_EVENT_PAYLOAD',
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects stale callback attempt when attempt number is older than latest accepted attempt', async () => {
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
                        id: 'run-11',
                        source: 'PRACUJ_PL',
                        userId: 'user-11',
                        careerProfileId: 'profile-11',
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
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb([])),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      value: 3,
                    },
                  ]),
                ),
            }),
          }),
        }),
      update: jest.fn(),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-11',
      eventId: 'event-11',
      attemptNo: 2,
      payloadHash: 'hash-11',
      status: 'COMPLETED',
      scrapedCount: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'RUNNING',
      inserted: 0,
      idempotent: true,
      reasonCode: 'STALE_ATTEMPT',
    });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects callback when OIDC issuer is unexpected', async () => {
    const verifyIdTokenMock = jest
      .spyOn(OAuth2Client.prototype as any, 'verifyIdToken')
      .mockImplementation(async () => ({
        getPayload: () => ({
          iss: 'https://issuer.example.com',
          email: 'worker@example.iam.gserviceaccount.com',
          email_verified: true,
        }),
      }));

    const service = new JobSourcesService(
      createConfigService({
        WORKER_CALLBACK_OIDC_AUDIENCE: 'https://api.example.com',
        WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL: 'worker@example.iam.gserviceaccount.com',
      }),
      createLogger(),
      {} as any,
    );

    await expect(
      service.completeScrape(
        {
          sourceRunId: 'run-oidc-issuer',
          status: 'FAILED',
          error: 'network',
        },
        'Bearer fake-id-token',
      ),
    ).rejects.toThrow('Invalid worker callback OIDC issuer');
    expect(verifyIdTokenMock).toHaveBeenCalled();
  });

  it('rejects callback when OIDC email is not verified for pinned service account', async () => {
    const verifyIdTokenMock = jest
      .spyOn(OAuth2Client.prototype as any, 'verifyIdToken')
      .mockImplementation(async () => ({
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          email: 'worker@example.iam.gserviceaccount.com',
          email_verified: false,
        }),
      }));

    const service = new JobSourcesService(
      createConfigService({
        WORKER_CALLBACK_OIDC_AUDIENCE: 'https://api.example.com',
        WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL: 'worker@example.iam.gserviceaccount.com',
      }),
      createLogger(),
      {} as any,
    );

    await expect(
      service.completeScrape(
        {
          sourceRunId: 'run-oidc-email',
          status: 'FAILED',
          error: 'network',
        },
        'Bearer fake-id-token',
      ),
    ).rejects.toThrow('Unverified worker callback service account email');
    expect(verifyIdTokenMock).toHaveBeenCalled();
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
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                total: 1,
                latestReceivedAt: new Date('2026-02-21T00:01:00.000Z'),
              },
            ]),
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
                          createdAt: new Date('2026-02-21T00:02:00.000Z'),
                          code: 'CALLBACK_ACCEPTED',
                        },
                      ]),
                    ),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                stage: 'listing_progress',
                status: 'warning',
                code: 'LISTING_FALLBACK_TRIGGERED',
                meta: { reason: 'http_blocked' },
              },
              {
                stage: 'listing_progress',
                status: 'success',
                code: 'LISTING_BROWSER_LAUNCH_COMPLETED',
                meta: {},
              },
              {
                stage: 'listing_progress',
                status: 'success',
                code: 'LISTING_BROWSER_NAVIGATION_COMPLETED',
                meta: {},
              },
            ]),
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
    expect(diagnostics.diagnostics.transportSummary).toEqual({
      listingTransport: 'http->browser',
      browserFallbackUsed: true,
      browserLaunchSucceeded: true,
      fallbackReasons: ['http_blocked'],
    });
    expect(diagnostics.diagnostics.browserSummary).toEqual({
      launchAttempts: 1,
      launchRetries: 0,
      launchDurationMs: null,
      launchArgs: [],
      channel: null,
      launchSucceeded: true,
      readyTimedOut: false,
      navigationSucceeded: true,
      failureReason: null,
    });
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

  it('accepts worker heartbeat and upgrades pending run to running', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-heartbeat-1',
                      status: 'PENDING',
                      progress: null,
                      lastHeartbeatAt: null,
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
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.heartbeatRun('run-heartbeat-1', {
      runId: 'worker-run-1',
      phase: 'listing_fetch',
      attempt: 1,
      pagesVisited: 2,
      jobLinksDiscovered: 8,
      normalizedOffers: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'RUNNING',
    });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('dedupes identical worker heartbeat events inside the coalescing window', async () => {
    const appendRunEvent = jest
      .spyOn(JobSourcesService.prototype as any, 'appendRunEvent')
      .mockResolvedValue(undefined);
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-heartbeat-2',
                      traceId: 'trace-heartbeat-2',
                      status: 'RUNNING',
                      progress: {
                        phase: 'detail_fetch',
                        attempt: 1,
                        pagesVisited: 2,
                        jobLinksDiscovered: 8,
                        normalizedOffers: 1,
                        meta: { stage: 'detail_http_fetch_started' },
                      },
                      lastHeartbeatAt: new Date(Date.now() - 5_000),
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
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.heartbeatRun('run-heartbeat-2', {
      runId: 'worker-run-2',
      phase: 'detail_fetch',
      attempt: 1,
      pagesVisited: 2,
      jobLinksDiscovered: 8,
      normalizedOffers: 1,
      meta: { stage: 'detail_http_fetch_started' },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'RUNNING',
      deduped: true,
    });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(appendRunEvent).not.toHaveBeenCalled();
  });

  it('classifies completed zero-job callbacks with discovered listings as degraded parse gaps', async () => {
    const updateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-complete-gap-1',
                      source: 'PRACUJ_PL',
                      userId: 'user-gap-1',
                      careerProfileId: 'profile-gap-1',
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
        set: updateSet,
      }),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-complete-gap-1',
      status: 'COMPLETED',
      scrapedCount: 0,
      totalFound: 3,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 0,
      totalOffers: 0,
      idempotent: true,
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        classifiedOutcome: 'detail_parse_gap',
        emptyReason: 'detail_parse_gap',
        sourceQuality: 'degraded',
      }),
    );
  });

  it('promotes pending run to running before completed callback finalization', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              then: (cb: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  cb([
                    {
                      id: 'run-transition-1',
                      source: 'PRACUJ_PL',
                      userId: 'user-transition-1',
                      careerProfileId: 'profile-transition-1',
                      status: 'PENDING',
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
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.completeScrape({
      sourceRunId: 'run-transition-1',
      status: 'COMPLETED',
      scrapedCount: 0,
      totalFound: 0,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 0,
      totalOffers: 0,
      idempotent: true,
    });
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it('builds valid postgres excluded column references for offer upserts', async () => {
    let capturedConflictConfig: { set: Record<string, unknown> } | null = null;

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
                        id: 'run-upsert-1',
                        source: 'PRACUJ_PL',
                        userId: 'user-upsert-1',
                        careerProfileId: 'profile-upsert-1',
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
            where: jest.fn().mockResolvedValue([{ id: 'offer-upsert-1' }]),
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
              onConflictDoUpdate: jest.fn().mockImplementation((config: { set: Record<string, unknown> }) => {
                capturedConflictConfig = config;
                return {
                  returning: jest.fn().mockResolvedValue([{ id: 'offer-upsert-1' }]),
                };
              }),
            }),
          };
        }

        if (table === userJobOffersTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 'user-offer-upsert-1' }]),
              }),
            }),
          };
        }

        throw new Error('Unexpected insert table');
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    jest.spyOn(service as any, 'getCareerProfileContext').mockResolvedValue({
      careerProfileId: 'profile-upsert-1',
      profile: candidateProfileFixture,
    });
    jest.spyOn(service as any, 'linkCatalogOffersToUser').mockResolvedValue({
      insertedCount: 1,
      totalCandidateCount: 1,
      matchedCount: 1,
    });

    const result = await service.completeScrape({
      sourceRunId: 'run-upsert-1',
      status: 'COMPLETED',
      scrapedCount: 1,
      totalFound: 1,
      jobs: [
        {
          url: 'https://example.com/jobs/1',
          title: 'Frontend Engineer',
          description: 'A real job description',
          company: 'Example Inc',
          location: 'Remote',
          source: 'pracuj-pl',
          requirements: ['TypeScript'],
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'COMPLETED',
      inserted: 1,
      totalOffers: 1,
    });
    expect(capturedConflictConfig).not.toBeNull();

    const dialect = new PgDialect();
    const sourceIdQuery = dialect.sqlToQuery(capturedConflictConfig!.set.sourceId as any);
    const expiresAtQuery = dialect.sqlToQuery(capturedConflictConfig!.set.expiresAt as any);

    expect(sourceIdQuery.sql).toContain('excluded."source_id"');
    expect(sourceIdQuery.sql).not.toContain('excluded."job_offers"');
    expect(expiresAtQuery.sql).toContain('excluded."is_expired"');
    expect(expiresAtQuery.sql).toContain('excluded."expires_at"');
  });

  it('links freshly scraped offers into the notebook even when rematch threshold would reject them', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'offer-low-score-1',
                    title: 'Junior QA Engineer',
                    company: 'Example Inc',
                    location: 'Onsite',
                    salary: null,
                    employmentType: 'umowa o prace',
                    description: 'Manual testing role with limited frontend overlap.',
                    requirements: [],
                    details: null,
                    lastSeenAt: new Date('2026-03-10T00:00:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      insert: jest.fn().mockImplementation((table) => {
        if (table === userJobOffersTable) {
          return {
            values: jest.fn().mockReturnValue({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 'user-offer-1', jobOfferId: 'offer-low-score-1' }]),
              }),
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

    jest.spyOn(candidateMatcher, 'scoreCandidateAgainstJob').mockReturnValue({
      score: 12,
      matchedCompetencies: [],
      hardConstraintViolations: ['location'],
      softPreferenceGaps: [],
      breakdown: {
        competencyFit: 0,
        roleFit: 0,
        keywordFit: 0,
        softWorkModes: 0,
        softEmploymentTypes: 0,
        softSalary: 0,
      },
      blockedByHardConstraints: true,
    });

    const service = new JobSourcesService(
      createConfigService({
        CATALOG_REMATCH_MIN_SCORE: 60,
      }),
      createLogger(),
      db,
    );

    const result = await (service as any).linkCatalogOffersToUser({
      userId: 'user-1',
      careerProfileId: 'profile-1',
      sourceRunId: 'run-1',
      source: 'PRACUJ_PL',
      profile: candidateProfileFixture,
      origin: 'SCRAPE',
      specificOfferIds: ['offer-low-score-1'],
    });

    expect(result).toMatchObject({
      insertedCount: 1,
      totalCandidateCount: 1,
      matchedCount: 1,
    });
  });

  it('writes coherent outcome metadata for catalog rematch runs', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    const db = {
      select: jest.fn(),
      insert: jest.fn().mockImplementation((table) => {
        if (table === jobSourceRunsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([
                {
                  id: 'run-rematch-1',
                  traceId: 'trace-rematch-1',
                  createdAt: new Date('2026-03-22T15:00:00.000Z'),
                },
              ]),
            }),
          };
        }
        return {
          values: jest.fn().mockResolvedValue(undefined),
        };
      }),
      update: jest.fn().mockReturnValue({
        set: updateSet,
      }),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    jest.spyOn(service as any, 'getCareerProfileContext').mockResolvedValue({
      careerProfileId: 'profile-rematch-1',
      profile: candidateProfileFixture,
    });
    jest.spyOn(service as any, 'countCatalogMatchesForProfile').mockResolvedValue(2);
    jest.spyOn(service as any, 'linkCatalogOffersToUser').mockResolvedValue({
      insertedCount: 0,
      totalCandidateCount: 2,
      matchedCount: 2,
    });
    jest.spyOn(service as any, 'appendRunEvent').mockResolvedValue(undefined);

    const result = await service.rematchCatalogForUser('user-1', 'profile-rematch-1', 20);

    expect(result).toMatchObject({
      ok: true,
      sourceRunId: 'run-rematch-1',
      inserted: 0,
      totalOffers: 2,
      matchedOffers: 2,
      status: 'reused',
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFound: 2,
        scrapedCount: 0,
        classifiedOutcome: 'success',
        sourceQuality: 'healthy',
        progress: expect.objectContaining({
          totalFound: 2,
          matchedOffers: 2,
          userInsertedOffers: 0,
        }),
      }),
    );
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

  it('aggregates source health quality, classified outcomes, and failure rollups', async () => {
    const now = new Date('2026-03-21T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              source: 'PRACUJ_PL',
              status: 'COMPLETED',
              failureType: null,
              classifiedOutcome: 'success',
              sourceQuality: 'healthy',
              createdAt: new Date('2026-03-21T10:00:00.000Z'),
              lastHeartbeatAt: null,
            },
            {
              source: 'PRACUJ_PL',
              status: 'COMPLETED',
              failureType: null,
              classifiedOutcome: 'partial_success',
              sourceQuality: 'degraded',
              createdAt: new Date('2026-03-21T10:10:00.000Z'),
              lastHeartbeatAt: null,
            },
            {
              source: 'PRACUJ_PL',
              status: 'COMPLETED',
              failureType: null,
              classifiedOutcome: 'detail_parse_gap',
              sourceQuality: 'degraded',
              createdAt: new Date('2026-03-21T10:20:00.000Z'),
              lastHeartbeatAt: null,
            },
            {
              source: 'PRACUJ_PL',
              status: 'COMPLETED',
              failureType: null,
              classifiedOutcome: 'filters_exhausted',
              sourceQuality: 'empty',
              createdAt: new Date('2026-03-21T10:30:00.000Z'),
              lastHeartbeatAt: null,
            },
            {
              source: 'PRACUJ_PL',
              status: 'FAILED',
              failureType: 'network',
              classifiedOutcome: 'failed:network',
              sourceQuality: 'failed',
              createdAt: new Date('2026-03-21T11:00:00.000Z'),
              lastHeartbeatAt: null,
            },
            {
              source: 'PRACUJ_PL',
              status: 'RUNNING',
              failureType: null,
              classifiedOutcome: null,
              sourceQuality: null,
              createdAt: new Date('2026-03-21T11:30:00.000Z'),
              lastHeartbeatAt: new Date('2026-03-21T11:40:00.000Z'),
            },
          ]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: jest.fn(),
    } as any;

    const service = new JobSourcesService(createConfigService(), createLogger(), db);
    const result = await service.getSourceHealth('user-20', 72);

    expect(result.windowHours).toBe(72);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      source: 'PRACUJ_PL',
      totalRuns: 6,
      completedRuns: 4,
      failedRuns: 1,
      successRate: 0.6667,
      networkFailures: 1,
      degradedRuns: 2,
      emptyRuns: 1,
      failedQualityRuns: 1,
      partialSuccessRuns: 1,
      filtersExhaustedRuns: 1,
      detailParseGapRuns: 1,
      latestRunStatus: 'RUNNING',
    });
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

  it('rejects retry when retry chain depth exceeds configured cap', async () => {
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
                      id: 'run-99',
                      source: 'PRACUJ_PL',
                      listingUrl: 'https://it.pracuj.pl/praca',
                      filters: null,
                      status: 'FAILED',
                      careerProfileId: 'profile-99',
                      retryCount: 5,
                    },
                  ]),
                ),
            }),
          }),
        }),
      }),
    } as any;

    const service = new JobSourcesService(
      createConfigService({
        SCRAPE_MAX_RETRY_CHAIN_DEPTH: 5,
      }),
      createLogger(),
      db,
    );
    await expect(service.retryRun('user-99', 'run-99')).rejects.toThrow('Retry chain depth exceeded');
  });
});

import { JobOffersService } from './job-offers.service';

const createSelectOfferQuery = (offer: Record<string, unknown> | undefined) => ({
  from: jest.fn().mockReturnValue({
    innerJoin: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb(offer ? [offer] : [])),
        }),
      }),
    }),
  }),
});

const createSelectProfileQuery = (profile: Record<string, unknown> | undefined) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb(profile ? [profile] : [])),
        }),
      }),
    }),
  }),
});

const createFocusQueueQuery = (items: Array<Record<string, unknown>>) => ({
  from: jest.fn().mockReturnValue({
    innerJoin: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue(items),
      }),
    }),
  }),
});

const createSummaryQuery = (items: Array<Record<string, unknown>>) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockResolvedValue(items),
    }),
  }),
});

const createBulkFollowUpTransaction = (rows: Array<Record<string, unknown>>, setMock: jest.Mock) => ({
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(rows),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: setMock,
  }),
});

describe('JobOffersService', () => {
  const baseOffer = {
    id: 'ujo-1',
    jobOfferId: 'job-1',
    description: 'React and TypeScript role',
    title: 'Frontend Engineer',
    company: 'Acme',
    location: 'Remote',
    employmentType: 'B2B',
    salary: '20 000 PLN',
    requirements: [],
    details: {},
  };

  const baseProfile = {
    contentJson: {
      schemaVersion: '1.0.0',
      candidateCore: {
        headline: 'Frontend developer',
        summary: 'Frontend developer focused on React and TypeScript',
        seniority: {
          primary: 'senior',
          secondary: [],
        },
        languages: [],
      },
      targetRoles: [
        {
          title: 'Frontend Engineer',
          confidenceScore: 0.95,
          confidenceLevel: 'high',
          priority: 1,
        },
      ],
      competencies: [
        {
          name: 'React',
          type: 'technology',
          confidenceScore: 0.95,
          confidenceLevel: 'high',
          importance: 'high',
          evidence: ['core daily tool'],
          isTransferable: false,
        },
        {
          name: 'TypeScript',
          type: 'technology',
          confidenceScore: 0.9,
          confidenceLevel: 'high',
          importance: 'high',
          evidence: ['core daily tool'],
          isTransferable: false,
        },
        {
          name: 'JavaScript',
          type: 'technology',
          confidenceScore: 0.92,
          confidenceLevel: 'high',
          importance: 'high',
          evidence: ['core daily tool'],
          isTransferable: false,
        },
        {
          name: 'HTML',
          type: 'technology',
          confidenceScore: 0.9,
          confidenceLevel: 'high',
          importance: 'medium',
          evidence: ['core daily tool'],
          isTransferable: false,
        },
        {
          name: 'CSS',
          type: 'technology',
          confidenceScore: 0.88,
          confidenceLevel: 'high',
          importance: 'medium',
          evidence: ['core daily tool'],
          isTransferable: false,
        },
        {
          name: 'Git',
          type: 'tool',
          confidenceScore: 0.85,
          confidenceLevel: 'high',
          importance: 'medium',
          evidence: ['daily collaboration'],
          isTransferable: true,
        },
        {
          name: 'REST API',
          type: 'methodology',
          confidenceScore: 0.82,
          confidenceLevel: 'medium',
          importance: 'medium',
          evidence: ['integration work'],
          isTransferable: true,
        },
        {
          name: 'Testing',
          type: 'methodology',
          confidenceScore: 0.8,
          confidenceLevel: 'medium',
          importance: 'medium',
          evidence: ['quality ownership'],
          isTransferable: true,
        },
      ],
      workPreferences: {
        hardConstraints: {
          workModes: ['remote'],
          employmentTypes: [],
          locations: [],
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
          { value: 'react', weight: 1 },
          { value: 'typescript', weight: 1 },
          { value: 'javascript', weight: 0.95 },
          { value: 'frontend', weight: 1 },
          { value: 'spa', weight: 0.7 },
          { value: 'ui', weight: 0.7 },
          { value: 'css', weight: 0.8 },
          { value: 'html', weight: 0.8 },
          { value: 'web performance', weight: 0.6 },
          { value: 'responsive design', weight: 0.6 },
          { value: 'rest api', weight: 0.6 },
          { value: 'testing', weight: 0.6 },
        ],
        specializations: [{ value: 'frontend', weight: 1 }],
        technologies: [
          { value: 'typescript', weight: 1 },
          { value: 'react', weight: 1 },
          { value: 'javascript', weight: 0.95 },
          { value: 'html', weight: 0.8 },
          { value: 'css', weight: 0.8 },
          { value: 'git', weight: 0.7 },
        ],
      },
      riskAndGrowth: {
        gaps: [],
        growthDirections: [],
        transferableStrengths: ['UI architecture'],
      },
    },
    userId: 'user-1',
    isActive: true,
    status: 'READY',
  };

  const createService = (generateText: jest.Mock) => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where: updateWhere });
    const update = jest.fn().mockReturnValue({ set });
    const select = jest
      .fn()
      .mockReturnValueOnce(createSelectOfferQuery(baseOffer))
      .mockReturnValueOnce(createSelectProfileQuery(baseProfile));
    const db = {
      select,
      update,
    } as any;

    const geminiService = { generateText } as any;
    const configService = {
      get: jest.fn((key: string) => (key === 'GEMINI_MODEL' ? 'gemini-1.5-flash-test' : undefined)),
    } as any;

    const service = new JobOffersService(db, geminiService, configService);
    return { service, update, set };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores deterministic score when LLM JSON cannot be parsed', async () => {
    const { service, update } = createService(jest.fn().mockResolvedValue('not-json-response'));

    const result = await service.scoreOffer('user-1', 'ujo-1', 0);
    expect(result.score).toBeGreaterThan(0);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('stores deterministic score when LLM generation fails', async () => {
    const { service, update } = createService(jest.fn().mockRejectedValue(new Error('vertex unavailable')));

    const result = await service.scoreOffer('user-1', 'ujo-1', 0);
    expect(result.score).toBeGreaterThan(0);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('stores scoring audit metadata with model and timestamp on success', async () => {
    const payload = '```json\n{"score":8,"summary":"Strong fit"}\n```';
    const { service, set, update } = createService(jest.fn().mockResolvedValue(payload));

    const result = await service.scoreOffer('user-1', 'ujo-1', 70);

    expect(result.score).toBeGreaterThan(0);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        matchScore: expect.any(Number),
        matchMeta: expect.objectContaining({
          audit: expect.objectContaining({
            provider: 'vertex-ai',
            model: 'gemini-1.5-flash-test',
            scoredAt: expect.any(String),
          }),
        }),
      }),
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('builds focus queues for due follow-ups, strict matches, and unscored leads', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-09T10:00:00.000Z'));

    const select = jest.fn().mockReturnValue(
      createFocusQueueQuery([
        {
          id: 'ujo-due',
          status: 'SAVED',
          matchScore: 81,
          matchMeta: { hardConstraintViolations: [] },
          pipelineMeta: { followUpAt: '2026-03-08T10:00:00.000Z' },
          title: 'Frontend Engineer',
          company: 'Acme',
          location: 'Remote',
          lastStatusAt: new Date('2026-03-08T12:00:00.000Z'),
          createdAt: new Date('2026-03-08T12:00:00.000Z'),
        },
        {
          id: 'ujo-strict',
          status: 'NEW',
          matchScore: 74,
          matchMeta: { hardConstraintViolations: [] },
          pipelineMeta: null,
          title: 'React Engineer',
          company: 'Globex',
          location: 'Warsaw',
          lastStatusAt: new Date('2026-03-07T12:00:00.000Z'),
          createdAt: new Date('2026-03-07T12:00:00.000Z'),
        },
        {
          id: 'ujo-unscored',
          status: 'NEW',
          matchScore: null,
          matchMeta: null,
          pipelineMeta: null,
          title: 'Junior Frontend',
          company: 'Initech',
          location: 'Krakow',
          lastStatusAt: new Date('2026-03-01T12:00:00.000Z'),
          createdAt: new Date('2026-03-01T12:00:00.000Z'),
        },
      ]),
    );
    const db = { select } as any;
    const service = new JobOffersService(
      db,
      { generateText: jest.fn() } as any,
      {
        get: jest.fn((key: string) => {
          if (key === 'NOTEBOOK_APPROX_VIOLATION_PENALTY') return 15;
          if (key === 'NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY') return 45;
          if (key === 'NOTEBOOK_APPROX_SCORED_BONUS') return 5;
          if (key === 'NOTEBOOK_EXPLORE_UNSCORED_BASE') return 55;
          if (key === 'NOTEBOOK_EXPLORE_RECENCY_WEIGHT') return 12;
          if (key === 'GEMINI_MODEL') return 'gemini-1.5-flash-test';
          return undefined;
        }),
      } as any,
    );

    const result = await service.getFocusQueue('user-1');

    expect(result.groups).toEqual([
      expect.objectContaining({
        key: 'follow-up-due',
        href: '/notebook?focus=followUpDue',
        count: 1,
        items: [expect.objectContaining({ id: 'ujo-due', followUpState: 'due' })],
      }),
      expect.objectContaining({
        key: 'strict-top',
        href: '/notebook?focus=strictTop',
        count: 2,
      }),
      expect.objectContaining({
        key: 'unscored-fresh',
        href: '/notebook?focus=unscored',
        count: 1,
        items: [expect.objectContaining({ id: 'ujo-unscored', matchScore: null })],
      }),
      expect.objectContaining({
        key: 'follow-up-upcoming',
        href: '/notebook?focus=followUpUpcoming',
        count: 0,
      }),
      expect.objectContaining({
        key: 'stale-untriaged',
        href: '/notebook?focus=staleUntriaged',
        count: 1,
      }),
    ]);
  });

  it('returns server-driven notebook quick actions in summary payload', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-09T10:00:00.000Z'));

    const select = jest.fn().mockReturnValue(
      createSummaryQuery([
        {
          id: 'ujo-due',
          status: 'SAVED',
          matchScore: 81,
          matchMeta: { hardConstraintViolations: [] },
          pipelineMeta: { followUpAt: '2026-03-08T10:00:00.000Z' },
          createdAt: new Date('2026-03-01T12:00:00.000Z'),
          lastStatusAt: new Date('2026-03-01T12:00:00.000Z'),
        },
        {
          id: 'ujo-unscored',
          status: 'NEW',
          matchScore: null,
          matchMeta: null,
          pipelineMeta: null,
          createdAt: new Date('2026-03-01T12:00:00.000Z'),
          lastStatusAt: new Date('2026-03-01T12:00:00.000Z'),
        },
      ]),
    );

    const service = new JobOffersService(
      { select } as any,
      { generateText: jest.fn() } as any,
      {
        get: jest.fn((key: string) => {
          if (key === 'NOTEBOOK_APPROX_VIOLATION_PENALTY') return 15;
          if (key === 'NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY') return 45;
          if (key === 'NOTEBOOK_APPROX_SCORED_BONUS') return 5;
          if (key === 'NOTEBOOK_EXPLORE_UNSCORED_BASE') return 55;
          if (key === 'NOTEBOOK_EXPLORE_RECENCY_WEIGHT') return 12;
          if (key === 'GEMINI_MODEL') return 'gemini-1.5-flash-test';
          return undefined;
        }),
      } as any,
    );

    const result = await service.getNotebookSummary('user-1');

    expect(result.quickActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'unscored', href: '/notebook?focus=unscored', count: 1 }),
        expect.objectContaining({ key: 'saved', href: '/notebook?focus=saved', count: 1 }),
        expect.objectContaining({ key: 'followUpDue', href: '/notebook?focus=followUpDue', count: 1 }),
      ]),
    );
  });

  it('bulk updates follow-up metadata while preserving existing pipeline fields', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where: updateWhere });
    const db = {
      transaction: async (callback: (tx: ReturnType<typeof createBulkFollowUpTransaction>) => Promise<unknown>) =>
        callback(
          createBulkFollowUpTransaction(
            [
              {
                id: 'ujo-1',
                pipelineMeta: {
                  contactName: 'Alex Recruiter',
                  followUpAt: '2026-03-08T10:00:00.000Z',
                },
              },
            ],
            set,
          ),
        ),
    } as any;

    const service = new JobOffersService(
      db,
      { generateText: jest.fn() } as any,
      {
        get: jest.fn((key: string) => {
          if (key === 'NOTEBOOK_APPROX_VIOLATION_PENALTY') return 15;
          if (key === 'NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY') return 45;
          if (key === 'NOTEBOOK_APPROX_SCORED_BONUS') return 5;
          if (key === 'NOTEBOOK_EXPLORE_UNSCORED_BASE') return 55;
          if (key === 'NOTEBOOK_EXPLORE_RECENCY_WEIGHT') return 12;
          if (key === 'GEMINI_MODEL') return 'gemini-1.5-flash-test';
          return undefined;
        }),
      } as any,
    );

    const result = await service.bulkUpdateFollowUp('user-1', {
      ids: ['ujo-1'],
      followUpAt: '2026-03-20T09:00:00.000Z',
      nextStep: 'Send follow-up email',
      note: 'Mention portfolio update',
    });

    expect(result).toEqual({
      updated: 1,
      summary: {
        due: 0,
        upcoming: 0,
        none: 1,
        noteApplied: true,
        nextStepApplied: true,
      },
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineMeta: {
          contactName: 'Alex Recruiter',
          followUpAt: '2026-03-20T09:00:00.000Z',
          nextStep: 'Send follow-up email',
          followUpNote: 'Mention portfolio update',
        },
      }),
    );
  });
});

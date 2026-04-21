import { CareerProfilesService } from './career-profiles.service';

describe('CareerProfilesService prompt builder', () => {
  it('queues generation and returns pending profile immediately', async () => {
    const queueSpy = jest
      .spyOn(CareerProfilesService.prototype as any, 'ensureGenerationQueued')
      .mockImplementation(() => {});
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) =>
                    Promise.resolve(
                      cb([
                        {
                          id: 'input-1',
                          targetRoles: 'Frontend Developer',
                          notes: 'note',
                          normalizedInput: null,
                          normalizationMeta: null,
                          intakePayload: null,
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
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([
                {
                  id: 'doc-1',
                  uploadedAt: new Date('2026-04-06T10:00:00.000Z'),
                  extractedAt: new Date('2026-04-06T10:05:00.000Z'),
                  extractedText: 'x'.repeat(900),
                },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb([])),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb([])),
                }),
              }),
            }),
          }),
        }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'profile-queued-1',
              status: 'PENDING',
              version: 1,
              generationStartedAt: null,
              generationLeaseExpiresAt: null,
            },
          ]),
        }),
      }),
    } as any;

    const service = new CareerProfilesService(
      db,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(15) } as any,
      { warn: jest.fn() } as any,
    );
    const result = await service.create('user-1', { instructions: 'focus on frontend' });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'profile-queued-1',
        status: 'PENDING',
        generationState: 'QUEUED',
        version: 1,
      }),
    );
    expect(queueSpy).toHaveBeenCalledWith('profile-queued-1', 'user-1', 'focus on frontend', expect.any(String));
    queueSpy.mockRestore();
  });

  it('reuses the active pending profile instead of inserting a duplicate version', async () => {
    const queueSpy = jest
      .spyOn(CareerProfilesService.prototype as any, 'ensureGenerationQueued')
      .mockImplementation(() => {});
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  then: (cb: (rows: unknown[]) => unknown) =>
                    Promise.resolve(
                      cb([
                        {
                          id: 'input-1',
                          targetRoles: 'Frontend Developer',
                          notes: 'note',
                          normalizedInput: null,
                          normalizationMeta: null,
                          intakePayload: null,
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
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([
                {
                  id: 'doc-1',
                  uploadedAt: new Date('2026-04-06T10:00:00.000Z'),
                  extractedAt: new Date('2026-04-06T10:05:00.000Z'),
                  extractedText: 'x'.repeat(900),
                },
              ]),
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
                          id: 'profile-pending-1',
                          status: 'PENDING',
                          version: 3,
                          generationStartedAt: null,
                          generationLeaseExpiresAt: null,
                        },
                      ]),
                    ),
                }),
              }),
            }),
          }),
        }),
      insert: jest.fn(),
    } as any;

    const service = new CareerProfilesService(
      db,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(15) } as any,
      { warn: jest.fn() } as any,
    );
    const result = await service.create('user-1', { instructions: 'focus on frontend' });

    expect(db.insert).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'profile-pending-1', generationState: 'QUEUED' }));
    expect(queueSpy).toHaveBeenCalledWith('profile-pending-1', 'user-1', 'focus on frontend', expect.any(String));
    queueSpy.mockRestore();
  });

  it('injects normalized input context into prompt', () => {
    const service = new CareerProfilesService(
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(15) } as any,
      { warn: jest.fn() } as any,
    );

    const prompt = (service as any).buildPrompt(
      'Frontend Developer',
      'note',
      { desiredPositions: ['Frontend Developer'] },
      [
        {
          storagePath: 'docs/cv.pdf',
          originalName: 'cv.pdf',
          mimeType: 'application/pdf',
          extractedText: 'Some text',
          extractedAt: new Date('2026-02-14T00:00:00.000Z'),
        },
      ],
      undefined,
      {
        roles: [{ name: 'Frontend Developer', aliases: [], priority: 1 }],
        seniority: ['mid'],
        specializations: ['frontend'],
        technologies: ['typescript', 'react'],
        workModes: ['remote'],
        workTime: ['full-time'],
        contractTypes: ['b2b'],
        locations: [],
        salary: null,
        languages: [],
        constraints: {
          noPolishRequired: false,
          ukrainiansWelcome: false,
          onlyEmployerOffers: false,
          onlyWithProjectDescription: false,
        },
        searchPreferences: {
          sourceKind: 'it',
          seniority: ['mid'],
          workModes: ['remote'],
          employmentTypes: ['b2b'],
          timeModes: ['full-time'],
          salaryMin: null,
          city: null,
          radiusKm: null,
          keywords: ['Frontend Developer', 'frontend', 'typescript', 'react'],
        },
        freeText: 'note',
      },
      {
        mapperVersion: 'v1.2.0',
        status: 'ok',
        warnings: [],
        errors: [],
        rawSnapshot: {
          targetRoles: 'Frontend Developer',
          notes: 'note',
          intakePayload: null,
        },
      },
    );

    expect(prompt).toContain('Normalized profile input (canonical, deterministic):');
    expect(prompt).toContain('"specializations": [');
    expect(prompt).toContain('Normalization status: ok (v1.2.0)');
    expect(prompt).toContain('Structured onboarding intake payload:');
    expect(prompt).toContain('"schemaVersion": "1.0.0"');
    expect(prompt).toContain('Return only JSON that strictly follows the requested schema.');
  });

  it('computes deterministic quality diagnostics from profile content', () => {
    const service = new CareerProfilesService(
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(15) } as any,
      { warn: jest.fn() } as any,
    );
    const quality = (service as any).evaluateProfileQuality({
      schemaVersion: '1.0.0',
      candidateCore: {
        headline: 'Frontend Engineer',
        summary: 'Summary',
        seniority: { primary: 'mid', secondary: [] },
        languages: [],
      },
      targetRoles: [{ title: 'Frontend Engineer', confidenceScore: 0.9, confidenceLevel: 'high', priority: 1 }],
      competencies: Array.from({ length: 6 }).map((_, index) => ({
        name: `Skill ${index}`,
        type: 'technology',
        confidenceScore: 0.7,
        confidenceLevel: 'medium',
        importance: 'medium',
        evidence: ['cv'],
        isTransferable: false,
      })),
      workPreferences: {
        hardConstraints: {
          workModes: ['remote'],
          employmentTypes: ['b2b'],
          locations: [],
          noPolishRequired: false,
          onlyEmployerOffers: false,
          onlyWithProjectDescription: false,
        },
        softPreferences: { workModes: [], employmentTypes: [], locations: [] },
      },
      searchSignals: {
        keywords: Array.from({ length: 10 }).map((_, index) => ({ value: `k-${index}`, weight: 0.6 })),
        specializations: [{ value: 'frontend', weight: 0.9 }],
        technologies: Array.from({ length: 5 }).map((_, index) => ({ value: `t-${index}`, weight: 0.7 })),
      },
      riskAndGrowth: { gaps: [], growthDirections: [], transferableStrengths: [] },
    });

    expect(quality.score).toBeGreaterThan(0);
    expect(Array.isArray(quality.signals)).toBe(true);
    expect(quality.signals.find((item: { key: string }) => item.key === 'seniority_defined')).toBeTruthy();
  });

  it('derives running generation state from an active lease', () => {
    const service = new CareerProfilesService(
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(15) } as any,
      { warn: jest.fn() } as any,
    );

    expect(
      (service as any).getGenerationState({
        status: 'PENDING',
        generationStartedAt: new Date('2026-04-21T10:00:00.000Z'),
        generationLeaseExpiresAt: new Date(Date.now() + 60_000),
      }),
    ).toBe('RUNNING');
  });
});

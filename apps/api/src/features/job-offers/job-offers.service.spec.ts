import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

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

describe('JobOffersService', () => {
  const baseOffer = {
    id: 'ujo-1',
    jobOfferId: 'job-1',
    description: 'React and TypeScript role',
    title: 'Frontend Engineer',
    company: 'Acme',
    location: 'Remote',
    requirements: [],
    details: {},
  };

  const baseProfile = {
    contentJson: {
      summary: 'Frontend developer',
      coreSkills: ['React', 'TypeScript'],
      preferredRoles: ['Frontend Engineer'],
      strengths: ['UI architecture'],
      gaps: [],
      topKeywords: ['react', 'typescript'],
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

  it('throws controlled bad request when LLM JSON cannot be parsed and does not update score', async () => {
    const { service, update } = createService(jest.fn().mockResolvedValue('not-json-response'));

    await expect(service.scoreOffer('user-1', 'ujo-1', 0)).rejects.toThrow(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('throws service unavailable when LLM generation fails and does not update score', async () => {
    const { service, update } = createService(jest.fn().mockRejectedValue(new Error('vertex unavailable')));

    await expect(service.scoreOffer('user-1', 'ujo-1', 0)).rejects.toThrow(ServiceUnavailableException);
    expect(update).not.toHaveBeenCalled();
  });

  it('stores scoring audit metadata with model and timestamp on success', async () => {
    const payload =
      '```json\n{"score":88,"matchedSkills":["React"],"matchedRoles":["Frontend Engineer"],"matchedStrengths":["UI architecture"],"matchedKeywords":["react"],"summary":"Strong fit"}\n```';
    const { service, set, update } = createService(jest.fn().mockResolvedValue(payload));

    const result = await service.scoreOffer('user-1', 'ujo-1', 70);

    expect(result.score).toBe(88);
    expect(result.isMatch).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        matchScore: 88,
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
});

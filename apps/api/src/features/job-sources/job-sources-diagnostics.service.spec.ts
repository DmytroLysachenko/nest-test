import { JobSourcesDiagnosticsService } from './job-sources-diagnostics.service';

const createConfigService = () =>
  ({
    get: jest.fn(),
  }) as any;

const createLogger = () =>
  ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }) as any;

describe('JobSourcesDiagnosticsService', () => {
  it('projects matching progress into the user-facing run list', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([
                    {
                      id: 'run-1',
                      traceId: 'trace-1',
                      source: 'PRACUJ_PL',
                      userId: 'user-1',
                      careerProfileId: 'profile-1',
                      listingUrl: 'https://it.pracuj.pl/praca',
                      filters: null,
                      status: 'COMPLETED',
                      totalFound: 20,
                      scrapedCount: 12,
                      error: null,
                      startedAt: new Date('2026-05-12T08:00:00.000Z'),
                      completedAt: new Date('2026-05-12T08:10:00.000Z'),
                      finalizedAt: null,
                      failureType: null,
                      progress: {
                        matchingState: 'deferred',
                        matchingUpdatedAt: '2026-05-12T08:10:00.000Z',
                        candidateOffers: 12,
                        matchedOffers: 6,
                        userInsertedOffers: 0,
                      },
                      createdAt: new Date('2026-05-12T08:00:00.000Z'),
                    },
                  ]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ total: 1 }]),
          }),
        }),
    } as any;

    const service = new JobSourcesDiagnosticsService(createConfigService(), createLogger(), db, {} as any);

    const result = await service.listRuns('user-1', { limit: 5 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'run-1',
      status: 'COMPLETED',
      matchingState: 'deferred',
      matchingUpdatedAt: '2026-05-12T08:10:00.000Z',
      candidateOffers: 12,
      matchedOffers: 6,
      linkedNotebookOffers: 0,
    });
    expect(result.items[0]?.finalizedAt).toEqual(new Date('2026-05-12T08:10:00.000Z'));
  });
});

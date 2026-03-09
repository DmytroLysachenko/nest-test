import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  const createDbMock = (results: unknown[][]) =>
    ({
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() => {
            const data = results.shift() ?? [];
            const resultObj = {
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(data),
              }),
              groupBy: jest.fn().mockResolvedValue(data),
              then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb(data)),
            };
            return resultObj;
          }),
        }),
      })),
    }) as any;

  const createConfigServiceMock = () =>
    ({
      get: jest.fn().mockReturnValue(60),
    }) as any;

  it('marks onboarding required when profile input and ready profile are missing', async () => {
    const values: unknown[][] = [
      [], // profile input
      [], // profile
      [], // offers status counts (groupBy)
      [{ value: 0 }], // offers scored
      [], // last offer
      [], // follow-up offers
      [], // document status counts
      [{ value: 0 }], // run total
      [], // latest run
    ];

    const db = createDbMock(values);

    const service = new WorkspaceService(db, createConfigServiceMock());
    const summary = await service.getSummary('user-1');

    expect(summary.workflow.needsOnboarding).toBe(true);
    expect(summary.offers.total).toBe(0);
  });

  it('marks onboarding complete for ready profile', async () => {
    const values: unknown[][] = [
      [{ id: 'pi-1', updatedAt: new Date('2026-01-01') }], // profile input
      [{ id: 'cp-1', status: 'READY', version: 3, updatedAt: new Date('2026-01-02') }], // profile
      [
        { status: 'SAVED', count: 5 },
        { status: 'APPLIED', count: 3 },
        { status: 'INTERVIEWING', count: 1 },
      ], // offers status counts
      [{ value: 8 }], // offers scored
      [{ updatedAt: new Date('2026-01-03') }], // last offer
      [{ status: 'APPLIED', pipelineMeta: { followUpAt: '2026-01-01T00:00:00.000Z' } }], // follow-up offers
      [{ status: 'READY', count: 2 }], // document status counts
      [{ value: 2 }], // run total
      [{ status: 'COMPLETED', createdAt: new Date('2026-01-04') }], // latest run
    ];

    const db = createDbMock(values);

    const service = new WorkspaceService(db, createConfigServiceMock());
    const summary = await service.getSummary('user-1');

    expect(summary.workflow.needsOnboarding).toBe(false);
    expect(summary.offers.total).toBe(9); // 5 + 3 + 1
    expect(summary.offers.saved).toBe(5);
    expect(summary.offers.applied).toBe(3);
    expect(summary.offers.followUpDue).toBe(1);
    expect(summary.scrape.lastRunStatus).toBe('COMPLETED');
    expect(summary.documents.ready).toBe(2);
  });
});

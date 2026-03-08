import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  const createDbMock = (results: unknown[][]) =>
    ({
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() => {
            const data = results.shift() ?? [];
            return {
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(data),
              }),
              then: (cb: (rows: unknown[]) => unknown) => Promise.resolve(cb(data)),
            };
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
      [{ value: 0 }], // offers total
      [{ value: 0 }], // offers scored
      [{ value: 0 }], // offers saved
      [{ value: 0 }], // offers applied
      [{ value: 0 }], // offers interviewing
      [{ value: 0 }], // offers made
      [{ value: 0 }], // offers rejected
      [], // last offer
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
      [{ value: 10 }], // offers total
      [{ value: 8 }], // offers scored
      [{ value: 5 }], // offers saved
      [{ value: 3 }], // offers applied
      [{ value: 1 }], // offers interviewing
      [{ value: 0 }], // offers made
      [{ value: 0 }], // offers rejected
      [{ updatedAt: new Date('2026-01-03') }], // last offer
      [{ value: 2 }], // run total
      [{ status: 'COMPLETED', createdAt: new Date('2026-01-04') }], // latest run
    ];

    const db = createDbMock(values);

    const service = new WorkspaceService(db, createConfigServiceMock());
    const summary = await service.getSummary('user-1');

    expect(summary.workflow.needsOnboarding).toBe(false);
    expect(summary.offers.total).toBe(10);
    expect(summary.scrape.lastRunStatus).toBe('COMPLETED');
  });
});

import { jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { OpsService } from './ops.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => overrides[key]),
  }) as any;

describe('OpsService', () => {
  it('returns aggregated queue/scrape/offer metrics', async () => {
    const db = {
      select: jest
        .fn()
        .mockImplementation((shape) => {
          if ('value' in shape) {
            return {
              from: jest.fn().mockImplementation((table) => {
                if (table === jobSourceRunsTable) {
                  return {
                    where: jest
                      .fn()
                      .mockResolvedValueOnce([{ value: 3 }]) // active
                      .mockResolvedValueOnce([{ value: 1 }]) // pending
                      .mockResolvedValueOnce([{ value: 2 }]) // running
                      .mockResolvedValueOnce([{ value: 10 }]) // total
                      .mockResolvedValueOnce([{ value: 8 }]) // completed
                      .mockResolvedValueOnce([{ value: 2 }]), // failed
                  };
                }
                if (table === userJobOffersTable) {
                  return {
                    where: jest.fn().mockResolvedValueOnce([{ value: 4 }]),
                  };
                }
                return { where: jest.fn().mockResolvedValue([{ value: 0 }]) };
              }),
            };
          }
          return {
            from: jest.fn().mockResolvedValue([{ value: 0 }]),
          };
        }),
    } as any;

    // For total offers without where()
    db.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 3 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 1 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 2 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 10 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 8 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 2 }]) }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ value: 40 }]),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ value: 4 }]) }),
      });

    const service = new OpsService(
      db,
      createConfigService({
        JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS: 72,
      }),
    );

    const result = await service.getMetrics();

    expect(result.windowHours).toBe(72);
    expect(result.queue.activeRuns).toBe(3);
    expect(result.scrape.totalRuns).toBe(10);
    expect(result.scrape.successRate).toBe(0.8);
    expect(result.offers.unscoredUserOffers).toBe(4);
  });
});


import { jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { OpsService } from './ops.service';

const createConfigService = (overrides: Record<string, unknown> = {}) =>
  ({
    get: jest.fn((key: string) => overrides[key]),
  }) as any;

describe('OpsService', () => {
  it('returns aggregated queue/scrape/offer/lifecycle metrics', async () => {
    const runWhere = jest
      .fn()
      .mockResolvedValueOnce([{ value: 3 }]) // active
      .mockResolvedValueOnce([{ value: 1 }]) // pending
      .mockResolvedValueOnce([{ value: 2 }]) // running
      .mockResolvedValueOnce([{ value: 10 }]) // total
      .mockResolvedValueOnce([{ value: 8 }]) // completed
      .mockResolvedValueOnce([{ value: 2 }]) // failed
      .mockResolvedValueOnce([{ value: 1 }]) // stale reconciled
      .mockResolvedValueOnce([{ value: 4 }]) // retries triggered
      .mockResolvedValueOnce([{ value: 3 }]); // retry completed
    const offerWhere = jest.fn().mockResolvedValueOnce([{ value: 4 }]); // unscored

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: runWhere }) })
        .mockReturnValueOnce({ from: jest.fn().mockResolvedValue([{ value: 40 }]) }) // total offers
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: offerWhere }) }), // unscored
    } as any;

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
    expect(result.lifecycle.staleReconciledRuns).toBe(1);
    expect(result.lifecycle.retriesTriggered).toBe(4);
    expect(result.lifecycle.retrySuccessRate).toBe(0.75);
  });
});

import 'reflect-metadata';

import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

import { JobSourcesController } from './job-sources.controller';

describe('JobSourcesController throttling metadata', () => {
  const target = JobSourcesController.prototype;
  const skipKey = `${THROTTLER_SKIP}default`;

  it('skips throttling for internal worker callbacks and scheduler trigger', () => {
    expect(Reflect.getMetadata(skipKey, target.completeScrape)).toBe(true);
    expect(Reflect.getMetadata(skipKey, target.heartbeat)).toBe(true);
    expect(Reflect.getMetadata(skipKey, target.ingestOffer)).toBe(true);
    expect(Reflect.getMetadata(skipKey, target.triggerSchedules)).toBe(true);
  });

  it('keeps user scrape enqueue throttled', () => {
    expect(Reflect.getMetadata(skipKey, target.enqueueScrape)).toBeUndefined();
    expect(Reflect.getMetadata(skipKey, target.rematchNow)).toBeUndefined();
  });
});

describe('JobSourcesController rematchNow', () => {
  const jobSourcesService = {
    rematchCatalogForUser: jest.fn(),
  };

  const controller = new JobSourcesController(jobSourcesService as any, {} as any, {} as any, {} as any);

  beforeEach(() => {
    jobSourcesService.rematchCatalogForUser.mockReset();
  });

  it('normalizes empty rematch results into a stable user-facing response', async () => {
    jobSourcesService.rematchCatalogForUser.mockResolvedValue({
      ok: true,
      inserted: 0,
      totalOffers: 0,
      matchedOffers: 0,
      status: 'empty',
    });

    await expect(controller.rematchNow({ userId: 'user-1' } as any)).resolves.toEqual({
      ok: true,
      status: 'empty',
      sourceRunId: null,
      traceId: null,
      acceptedAt: null,
      inserted: 0,
      totalOffers: 0,
      matchedOffers: 0,
      message: 'No recent catalog offers matched your current profile.',
    });
  });

  it('passes through reused rematch results with a recovery message', async () => {
    jobSourcesService.rematchCatalogForUser.mockResolvedValue({
      ok: true,
      sourceRunId: 'run-1',
      traceId: 'trace-1',
      acceptedAt: '2026-05-12T20:00:00.000Z',
      inserted: 4,
      totalOffers: 9,
      matchedOffers: 6,
      status: 'reused',
    });

    await expect(controller.rematchNow({ userId: 'user-1' } as any)).resolves.toEqual({
      ok: true,
      status: 'reused',
      sourceRunId: 'run-1',
      traceId: 'trace-1',
      acceptedAt: '2026-05-12T20:00:00.000Z',
      inserted: 4,
      totalOffers: 9,
      matchedOffers: 6,
      message: 'Matched offers were rebuilt from the shared catalog.',
    });
  });
});

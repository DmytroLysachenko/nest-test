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
  });
});

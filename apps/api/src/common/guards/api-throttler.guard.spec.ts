import { shouldBypassApiThrottle } from './api-throttler.guard';

describe('ApiThrottlerGuard helpers', () => {
  it.each(['/', '/health', '/health?probe=1', '/health/test', '/docs', '/docs/index.html'])(
    'bypasses throttling for smoke-safe path %s',
    (path) => {
      expect(shouldBypassApiThrottle(path)).toBe(true);
    },
  );

  it.each(['/api/health', '/api/user', '/api/job-sources/scrape', undefined])(
    'keeps throttling enabled for non-bypass path %s',
    (path) => {
      expect(shouldBypassApiThrottle(path)).toBe(false);
    },
  );
});

import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/lib/http/api-error';
import { WORKSPACE_RATE_LIMIT_MESSAGE, isRateLimitedError } from '@/shared/lib/http/rate-limit';

describe('rate-limit helpers', () => {
  it('detects 429 api errors', () => {
    const error = new ApiError(429, {
      error: {
        message: WORKSPACE_RATE_LIMIT_MESSAGE,
        code: 'RATE_LIMITED',
      },
    });

    expect(isRateLimitedError(error)).toBe(true);
  });

  it('ignores non-rate-limited errors', () => {
    const error = new ApiError(500, {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });

    expect(isRateLimitedError(error)).toBe(false);
    expect(isRateLimitedError(new Error('network down'))).toBe(false);
  });
});

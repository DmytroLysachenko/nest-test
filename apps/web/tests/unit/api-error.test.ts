import { ApiError } from '@/shared/lib/http/api-error';

describe('ApiError', () => {
  it('builds error details from API payload', () => {
    const error = new ApiError(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: ['field is required'],
      },
      meta: {
        traceId: 'trace-123',
      },
    });

    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid payload');
    expect(error.details).toEqual(['field is required']);
  });
});

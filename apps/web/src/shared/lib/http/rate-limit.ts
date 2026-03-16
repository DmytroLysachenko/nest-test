import { ApiError } from '@/shared/lib/http/api-error';

export const WORKSPACE_RATE_LIMIT_MESSAGE =
  'The workspace is temporarily rate limited. Existing data will stay visible; retry in a moment.';

export const isRateLimitedError = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.status === 429 || error.code === 'RATE_LIMITED');

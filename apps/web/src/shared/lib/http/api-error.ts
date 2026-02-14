import type { ApiErrorPayload } from '@/shared/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string[];

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.error.message ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error.code ?? 'UNKNOWN_ERROR';
    this.details = payload?.error.details;
  }
}

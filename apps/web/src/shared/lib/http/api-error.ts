import type { ApiErrorPayload } from '@/shared/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string[];
  readonly requestId?: string;
  readonly traceId?: string;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? payload?.error?.message ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code ?? payload?.error?.code ?? 'UNKNOWN_ERROR';
    this.details = payload?.details ?? payload?.error?.details;
    this.requestId = payload?.requestId ?? payload?.meta?.traceId;
    this.traceId = payload?.meta?.traceId ?? payload?.requestId;
  }
}

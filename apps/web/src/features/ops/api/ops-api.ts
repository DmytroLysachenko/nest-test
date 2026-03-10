import { apiRequest, apiTextRequest } from '@/shared/lib/http/api-client';

import type { ApiRequestEventsListDto, CallbackEventsListDto } from '@/shared/types/api';

export const listCallbackEvents = (
  token: string,
  params: { status?: string; sourceRunId?: string; limit?: number; offset?: number } = {},
) => {
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.sourceRunId) {
    query.set('sourceRunId', params.sourceRunId);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest<CallbackEventsListDto>(`/ops/scrape/callback-events${suffix}`, {
    method: 'GET',
    token,
  });
};

export const exportCallbackEventsCsv = (token: string) =>
  apiTextRequest('/ops/scrape/callback-events/export.csv', {
    method: 'GET',
    token,
  });

export const listApiRequestEvents = (
  token: string,
  params: {
    level?: string;
    statusCode?: number;
    path?: string;
    requestId?: string;
    limit?: number;
    offset?: number;
  } = {},
) => {
  const query = new URLSearchParams();
  if (params.level) {
    query.set('level', params.level);
  }
  if (params.statusCode !== undefined) {
    query.set('statusCode', String(params.statusCode));
  }
  if (params.path) {
    query.set('path', params.path);
  }
  if (params.requestId) {
    query.set('requestId', params.requestId);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest<ApiRequestEventsListDto>(`/ops/api-request-events${suffix}`, {
    method: 'GET',
    token,
  });
};

import { apiRequest } from '@/shared/lib/http/api-client';

import type { CallbackEventsListDto } from '@/shared/types/api';

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

import { apiRequest } from '@/shared/lib/http/api-client';

import type { JobOfferHistoryDto, JobOffersListDto, JobOfferScoreResultDto, JobOfferStatus } from '@/shared/types/api';

export type ListJobOffersParams = {
  limit?: number;
  offset?: number;
  status?: JobOfferStatus;
  minScore?: number;
  search?: string;
  tag?: string;
  hasScore?: boolean;
};

const toQuery = (params: ListJobOffersParams) => {
  const query = new URLSearchParams();
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.minScore !== undefined) {
    query.set('minScore', String(params.minScore));
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.tag) {
    query.set('tag', params.tag);
  }
  if (params.hasScore !== undefined) {
    query.set('hasScore', params.hasScore ? 'true' : 'false');
  }

  const value = query.toString();
  return value ? `?${value}` : '';
};

export const listJobOffers = (token: string, params: ListJobOffersParams) =>
  apiRequest<JobOffersListDto>(`/job-offers${toQuery(params)}`, {
    method: 'GET',
    token,
  });

export const updateJobOfferStatus = (token: string, id: string, status: JobOfferStatus) =>
  apiRequest<{ id: string; status: JobOfferStatus }>(`/job-offers/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });

export const updateJobOfferMeta = (token: string, id: string, payload: { notes?: string; tags?: string[] }) =>
  apiRequest<{ id: string; notes: string | null; tags: string[] | null }>(`/job-offers/${id}/meta`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });

export const scoreJobOffer = (token: string, id: string, minScore = 0) =>
  apiRequest<JobOfferScoreResultDto>(`/job-offers/${id}/score`, {
    method: 'POST',
    token,
    body: JSON.stringify({ minScore }),
  });

export const getJobOfferHistory = (token: string, id: string) =>
  apiRequest<JobOfferHistoryDto>(`/job-offers/${id}/history`, {
    method: 'GET',
    token,
  });

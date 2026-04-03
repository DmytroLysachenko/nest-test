import { apiRequest } from '@/shared/lib/http/api-client';

import type {
  DiscoveryJobOffersListDto,
  DiscoverySummaryDto,
  JobOfferHistoryDto,
  JobOfferFocusDto,
  JobOfferActionPlanDto,
  JobOfferSummaryDto,
  JobOfferPrepPacketDto,
  JobOffersListDto,
  JobOfferScoreResultDto,
  JobOfferStatus,
  NotebookPreferencesDto,
  NotebookFiltersDto,
} from '@/shared/types/api';

export type ListJobOffersParams = {
  limit?: number;
  offset?: number;
  status?: JobOfferStatus;
  mode?: 'strict' | 'approx' | 'explore';
  minScore?: number;
  search?: string;
  tag?: string;
  hasScore?: boolean;
  followUp?: 'due' | 'upcoming' | 'none';
  attention?:
    | 'staleUntriaged'
    | 'missingNextStep'
    | 'stalePipeline'
    | 'followUpOverdue'
    | 'followUpDueToday'
    | 'prepRecommended'
    | 'awaitingDecision';
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
  if (params.mode) {
    query.set('mode', params.mode);
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
  if (params.followUp) {
    query.set('followUp', params.followUp);
  }
  if (params.attention) {
    query.set('attention', params.attention);
  }

  const value = query.toString();
  return value ? `?${value}` : '';
};

export const listJobOffers = (token: string, params: ListJobOffersParams) =>
  apiRequest<JobOffersListDto>(`/job-offers${toQuery(params)}`, {
    method: 'GET',
    token,
  });

export const listDiscoveryJobOffers = (token: string, params: ListJobOffersParams) =>
  apiRequest<DiscoveryJobOffersListDto>(`/job-offers/discovery${toQuery(params)}`, {
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

export const updateJobOfferFeedback = (
  token: string,
  id: string,
  payload: { aiFeedbackScore: number; aiFeedbackNotes?: string },
) =>
  apiRequest<{ id: string; aiFeedbackScore: number | null; aiFeedbackNotes: string | null }>(
    `/job-offers/${id}/feedback`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    },
  );

export const updateJobOfferPipeline = (token: string, id: string, payload: { pipelineMeta: Record<string, unknown> }) =>
  apiRequest<{ id: string; pipelineMeta: Record<string, unknown> | null }>(`/job-offers/${id}/pipeline`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });

export const bulkUpdateJobOfferFollowUp = (
  token: string,
  payload: { ids: string[]; followUpAt: string | null; nextStep?: string | null; note?: string | null },
) =>
  apiRequest<{
    updated: number;
    summary: {
      due: number;
      upcoming: number;
      none: number;
      noteApplied: boolean;
      nextStepApplied: boolean;
    };
  }>('/job-offers/pipeline/bulk-follow-up', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const bulkUpdateJobOfferWorkflow = (
  token: string,
  payload: {
    ids: string[];
    followUpAt?: string | null;
    nextStep?: string | null;
    note?: string | null;
    decisionDueAt?: string | null;
    prepRecommended?: boolean | null;
  },
) =>
  apiRequest<{
    updated: number;
    summary: {
      due: number;
      upcoming: number;
      none: number;
      noteApplied: boolean;
      nextStepApplied: boolean;
      prepRecommendedApplied: boolean;
      decisionDueApplied: boolean;
      prepRecommendedCount: number;
      decisionDueCount: number;
    };
  }>('/job-offers/pipeline/bulk-workflow', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const dismissAllSeenJobOffers = (token: string) =>
  apiRequest<{ count: number }>('/job-offers/dismiss-all-seen', {
    method: 'POST',
    token,
  });

export const autoArchiveOldJobOffers = (token: string) =>
  apiRequest<{ count: number }>('/job-offers/auto-archive', {
    method: 'POST',
    token,
  });

export const scoreJobOffer = (token: string, id: string, minScore = 0) =>
  apiRequest<JobOfferScoreResultDto>(`/job-offers/${id}/score`, {
    method: 'POST',
    token,
    body: JSON.stringify({ minScore }),
  });

export const generateJobOfferPrep = (token: string, id: string, payload: { instructions?: string } = {}) =>
  apiRequest<Record<string, unknown>>(`/job-offers/${id}/generate-prep`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const getJobOfferHistory = (token: string, id: string) =>
  apiRequest<JobOfferHistoryDto>(`/job-offers/${id}/history`, {
    method: 'GET',
    token,
  });

export const getNotebookPreferences = (token: string) =>
  apiRequest<NotebookPreferencesDto>('/job-offers/preferences', {
    method: 'GET',
    token,
  });

export const getNotebookSummary = (token: string) =>
  apiRequest<JobOfferSummaryDto>('/job-offers/summary', {
    method: 'GET',
    token,
  });

export const getDiscoverySummary = (token: string) =>
  apiRequest<DiscoverySummaryDto>('/job-offers/discovery/summary', {
    method: 'GET',
    token,
  });

export const getJobOfferFocus = (token: string) =>
  apiRequest<JobOfferFocusDto>('/job-offers/focus', {
    method: 'GET',
    token,
  });

export const getJobOfferActionPlan = (token: string) =>
  apiRequest<JobOfferActionPlanDto>('/job-offers/action-plan', {
    method: 'GET',
    token,
  });

export const getJobOfferPrepPacket = (token: string, id: string) =>
  apiRequest<JobOfferPrepPacketDto>(`/job-offers/${id}/prep-packet`, {
    method: 'GET',
    token,
  });

export const completeJobOfferFollowUp = (
  token: string,
  id: string,
  payload: { note?: string; nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week' } = {},
) =>
  apiRequest<{ id: string }>(`/job-offers/${id}/follow-up/complete`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const snoozeJobOfferFollowUp = (token: string, id: string, payload: { durationHours?: number } = {}) =>
  apiRequest<{ id: string }>(`/job-offers/${id}/follow-up/snooze`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const clearJobOfferFollowUp = (token: string, id: string) =>
  apiRequest<{ id: string }>(`/job-offers/${id}/follow-up/clear`, {
    method: 'POST',
    token,
  });

export const updateNotebookPreferences = (
  token: string,
  payload: { filters: NotebookFiltersDto; savedPreset: NotebookFiltersDto | null },
) =>
  apiRequest<NotebookPreferencesDto>('/job-offers/preferences', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });

export type JobOfferPreviewRow = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  matchScore: number | null;
};

export const getJobOffersPreview = (data: JobOffersListDto): JobOfferPreviewRow[] =>
  data.items.map((offer) => ({
    id: offer.id,
    title: offer.title,
    company: offer.company,
    location: offer.location,
    matchScore: offer.matchScore,
  }));

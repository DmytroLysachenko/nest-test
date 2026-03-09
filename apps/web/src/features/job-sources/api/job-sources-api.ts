import { apiRequest, apiTextRequest } from '@/shared/lib/http/api-client';

import type {
  EnqueueScrapeResponseDto,
  ScrapePreflightDto,
  ScrapeScheduleDto,
  JobSourceHealthDto,
  JobSourceRunDiagnosticsDto,
  JobSourceRunDiagnosticsSummaryDto,
  JobSourceRunsListDto,
} from '@/shared/types/api';

type EnqueueScrapePayload = {
  listingUrl?: string;
  limit?: number;
  source?: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
  filters?: Record<string, unknown>;
};

export const enqueueScrape = (token: string, payload: EnqueueScrapePayload) =>
  apiRequest<EnqueueScrapeResponseDto>('/job-sources/scrape', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const listJobSourceRuns = (
  token: string,
  params?: {
    status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    failureType?: 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown';
    source?: 'PRACUJ_PL';
    retriedFrom?: string;
    limit?: number;
    offset?: number;
    windowHours?: number;
    includeRetried?: boolean;
  },
) => {
  const queryParams = new URLSearchParams();
  if (params?.status) {
    queryParams.set('status', params.status);
  }
  if (params?.retriedFrom) {
    queryParams.set('retriedFrom', params.retriedFrom);
  }
  if (params?.failureType) {
    queryParams.set('failureType', params.failureType);
  }
  if (params?.source) {
    queryParams.set('source', params.source);
  }
  if (params?.limit !== undefined) {
    queryParams.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    queryParams.set('offset', String(params.offset));
  }
  if (params?.windowHours !== undefined) {
    queryParams.set('windowHours', String(params.windowHours));
  }
  if (params?.includeRetried !== undefined) {
    queryParams.set('includeRetried', String(params.includeRetried));
  }
  const query = queryParams.size ? `?${queryParams.toString()}` : '';
  return apiRequest<JobSourceRunsListDto>(`/job-sources/runs${query}`, {
    method: 'GET',
    token,
  });
};

export const retryJobSourceRun = (token: string, runId: string) =>
  apiRequest<EnqueueScrapeResponseDto>(`/job-sources/runs/${runId}/retry`, {
    method: 'POST',
    token,
  });

export const getJobSourceRunDiagnostics = (token: string, runId: string) =>
  apiRequest<JobSourceRunDiagnosticsDto>(`/job-sources/runs/${runId}/diagnostics`, {
    method: 'GET',
    token,
  });

export const getJobSourceRunDiagnosticsSummary = (
  token: string,
  windowHours = 72,
  options?: { includeTimeline?: boolean; bucket?: 'hour' | 'day' },
) => {
  const query = new URLSearchParams();
  query.set('windowHours', String(windowHours));
  if (options?.includeTimeline !== undefined) {
    query.set('includeTimeline', String(options.includeTimeline));
  }
  if (options?.bucket) {
    query.set('bucket', options.bucket);
  }

  return apiRequest<JobSourceRunDiagnosticsSummaryDto>(`/job-sources/runs/diagnostics/summary?${query.toString()}`, {
    method: 'GET',
    token,
  });
};

export const getJobSourceHealth = (token: string, windowHours = 72) =>
  apiRequest<JobSourceHealthDto>(`/job-sources/sources/health?windowHours=${windowHours}`, {
    method: 'GET',
    token,
  });

export const exportJobSourceRunsCsv = (token: string) =>
  apiTextRequest('/job-sources/runs/export.csv', {
    method: 'GET',
    token,
  });

export const getScrapeSchedule = (token: string) =>
  apiRequest<ScrapeScheduleDto>('/job-sources/schedule', {
    method: 'GET',
    token,
  });

export const updateScrapeSchedule = (
  token: string,
  payload: { enabled: boolean; cron?: string; timezone?: string; source?: string; limit?: number },
) =>
  apiRequest<ScrapeScheduleDto>('/job-sources/schedule', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });

export const triggerScheduleNow = (token: string) =>
  apiRequest<EnqueueScrapeResponseDto>('/job-sources/schedule/trigger-now', {
    method: 'POST',
    token,
  });

export const getScrapePreflight = (
  token: string,
  params?: {
    source?: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
    listingUrl?: string;
    limit?: number;
  },
) => {
  const query = new URLSearchParams();
  if (params?.source) {
    query.set('source', params.source);
  }
  if (params?.listingUrl) {
    query.set('listingUrl', params.listingUrl);
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest<ScrapePreflightDto>(`/job-sources/preflight${suffix}`, {
    method: 'GET',
    token,
  });
};

import { apiRequest } from '@/shared/lib/http/api-client';

import type {
  EnqueueScrapeResponseDto,
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
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  retriedFrom?: string,
) => {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  if (retriedFrom) {
    params.set('retriedFrom', retriedFrom);
  }
  const query = params.size ? `?${params.toString()}` : '';
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

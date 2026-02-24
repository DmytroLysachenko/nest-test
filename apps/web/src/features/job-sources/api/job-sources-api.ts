import { apiRequest } from '@/shared/lib/http/api-client';

import type { EnqueueScrapeResponseDto, JobSourceRunDiagnosticsDto, JobSourceRunsListDto } from '@/shared/types/api';

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

export const listJobSourceRuns = (token: string, status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED') => {
  const query = status ? `?status=${status}` : '';
  return apiRequest<JobSourceRunsListDto>(`/job-sources/runs${query}`, {
    method: 'GET',
    token,
  });
};

export const getJobSourceRunDiagnostics = (token: string, runId: string) =>
  apiRequest<JobSourceRunDiagnosticsDto>(`/job-sources/runs/${runId}/diagnostics`, {
    method: 'GET',
    token,
  });

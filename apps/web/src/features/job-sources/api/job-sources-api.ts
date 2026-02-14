import { apiRequest } from '@/shared/lib/http/api-client';

import type { EnqueueScrapeResponseDto, JobSourceRunsListDto } from '@/shared/types/api';

type EnqueueScrapePayload = {
  listingUrl: string;
  limit?: number;
  source?: 'pracuj-pl';
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

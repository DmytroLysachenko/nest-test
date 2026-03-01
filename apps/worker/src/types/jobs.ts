import type { ScrapeFilters } from '@repo/db';

export type ScrapeSourceJob = {
  source: string;
  runId?: string;
  sourceRunId?: string;
  requestId?: string;
  callbackUrl?: string;
  heartbeatUrl?: string;
  callbackToken?: string;
  userId?: string;
  careerProfileId?: string;
  listingUrl?: string;
  limit?: number;
  filters?: ScrapeFilters;
};

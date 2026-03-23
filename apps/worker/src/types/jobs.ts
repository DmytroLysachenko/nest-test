import type { ScrapeFilters } from '@repo/db';

export type AdaptiveQueryWindow = {
  min: number;
  max: number;
};

export type ScrapeSourceJob = {
  taskSchemaVersion?: '1';
  source: string;
  runId?: string;
  sourceRunId?: string;
  traceId?: string;
  requestId?: string;
  dedupeKey?: string;
  callbackUrl?: string;
  heartbeatUrl?: string;
  callbackToken?: string;
  userId?: string;
  careerProfileId?: string;
  listingUrl?: string;
  limit?: number;
  filters?: ScrapeFilters;
  matchingFilters?: ScrapeFilters;
  adaptiveQueryWindow?: AdaptiveQueryWindow;
};

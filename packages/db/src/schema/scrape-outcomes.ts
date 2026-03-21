const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const SCRAPE_RESULT_KINDS = ['healthy', 'empty', 'blocked', 'failed'] as const;
export type ScrapeResultKind = (typeof SCRAPE_RESULT_KINDS)[number];

export const SCRAPE_EMPTY_REASONS = ['filters_exhausted', 'no_listings', 'detail_parse_gap'] as const;
export type ScrapeEmptyReason = (typeof SCRAPE_EMPTY_REASONS)[number];

export const SCRAPE_SOURCE_QUALITIES = ['healthy', 'degraded', 'empty', 'failed'] as const;
export type ScrapeSourceQuality = (typeof SCRAPE_SOURCE_QUALITIES)[number];

export const SCRAPE_CLASSIFIED_OUTCOMES = [
  'success',
  'partial_success',
  'blocked_by_source',
  'listing_empty',
  'filters_exhausted',
  'detail_parse_gap',
  'callback_rejected',
  'worker_timeout',
  'failed:validation',
  'failed:network',
  'failed:parse',
  'failed:unknown',
] as const;
export type ScrapeClassifiedOutcome = (typeof SCRAPE_CLASSIFIED_OUTCOMES)[number];

export type ScrapeFailureType = 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown';
export type ScrapeRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export const normalizeScrapeResultKind = (value: string | null | undefined): ScrapeResultKind | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return SCRAPE_RESULT_KINDS.includes(normalized as ScrapeResultKind) ? (normalized as ScrapeResultKind) : null;
};

export const normalizeScrapeEmptyReason = (value: string | null | undefined): ScrapeEmptyReason | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return SCRAPE_EMPTY_REASONS.includes(normalized as ScrapeEmptyReason) ? (normalized as ScrapeEmptyReason) : null;
};

export const normalizeScrapeSourceQuality = (value: string | null | undefined): ScrapeSourceQuality | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return SCRAPE_SOURCE_QUALITIES.includes(normalized as ScrapeSourceQuality)
    ? (normalized as ScrapeSourceQuality)
    : null;
};

export const classifyScrapeOutcome = (input: {
  status: ScrapeRunStatus;
  failureType?: ScrapeFailureType | null;
  resultKind?: string | null;
  emptyReason?: string | null;
  scrapedCount?: number | null;
}): ScrapeClassifiedOutcome => {
  const resultKind = normalizeScrapeResultKind(input.resultKind);
  const emptyReason = normalizeScrapeEmptyReason(input.emptyReason);
  const scrapedCount = Math.max(0, Number(input.scrapedCount ?? 0));

  if (input.status === 'COMPLETED') {
    if (scrapedCount > 0) {
      return resultKind === 'blocked' ? 'partial_success' : 'success';
    }

    if (resultKind === 'blocked') {
      return 'blocked_by_source';
    }
    if (emptyReason === 'filters_exhausted') {
      return 'filters_exhausted';
    }
    if (emptyReason === 'detail_parse_gap') {
      return 'detail_parse_gap';
    }
    return 'listing_empty';
  }

  if (input.failureType === 'callback') {
    return 'callback_rejected';
  }
  if (input.failureType === 'timeout') {
    return 'worker_timeout';
  }
  if (input.failureType === 'validation') {
    return 'failed:validation';
  }
  if (input.failureType === 'network') {
    return 'failed:network';
  }
  if (input.failureType === 'parse') {
    return 'failed:parse';
  }

  return 'failed:unknown';
};

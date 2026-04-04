export type RawPage = {
  url: string;
  html: string;
  isExpired?: boolean;
};

export type DetailFetchDiagnostics = {
  url: string;
  finalUrl?: string;
  status?: number | null;
  title?: string;
  htmlLength?: number;
  blocked?: boolean;
  expired?: boolean;
  transport?: 'http' | 'browser';
  attempt: number;
  error?: string;
};

export type JobDetails = {
  technologies?: {
    required?: string[];
    niceToHave?: string[];
    all?: string[];
  };
  requirements?: {
    required?: string[];
    niceToHave?: string[];
    all?: string[];
  };
  positionLevels?: string[];
  workModes?: string[];
  workSchedules?: string[];
  contractTypes?: string[];
  seniority?: string;
  workplace?: string;
  companyLocation?: string;
  companyDescription?: string;
  benefits?: string[];
};

export type ListingJobSummary = {
  url: string;
  title?: string;
  company?: string;
  location?: string;
  sourceId?: string;
  description?: string;
  salary?: string;
  isRemote?: boolean;
  details?: JobDetails;
};

export type ParsedJob = {
  title: string;
  company?: string;
  location?: string;
  description: string;
  url: string;
  applyUrl?: string;
  postedAt?: string;
  sourceCompanyProfileUrl?: string;
  salary?: string;
  employmentType?: string;
  sourceId?: string;
  requirements?: string[];
  tags?: string[];
  details?: JobDetails;
  isExpired?: boolean;
  rawPayload?: Record<string, unknown>;
};

export type NormalizedJob = {
  source: string;
  sourceId: string | null;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  url: string;
  applyUrl?: string | null;
  postedAt?: string | null;
  sourceCompanyProfileUrl?: string | null;
  tags: string[];
  salary: string | null;
  employmentType: string | null;
  requirements: string[];
  details?: JobDetails;
  isExpired?: boolean;
  rawPayload?: Record<string, unknown>;
};

export type SourceFetchResult = {
  pages: RawPage[];
  jobLinks: string[];
  recommendedJobLinks: string[];
  skippedUrls: string[];
  blockedUrls: string[];
  listingHtml?: string;
  listingData?: unknown;
  listingSummaries: ListingJobSummary[];
  detailDiagnostics: DetailFetchDiagnostics[];
  hasZeroOffers: boolean;
  detailAttemptedCount: number;
  detailBudget: number | null;
  detailStopReason: 'completed' | 'budget_reached' | 'source_degraded';
};

export type ScrapeSourceAdapter = {
  id: string;
  defaultListingUrl: string;
  normalizeSource: string;
  transportPolicy: string;
  buildListingUrl: (filters: Record<string, unknown>) => string;
  fetch: (input: {
    headless: boolean;
    listingUrl: string;
    limit?: number;
    logger: unknown;
    options?: Record<string, unknown>;
  }) => Promise<SourceFetchResult>;
  parse: (pages: RawPage[]) => ParsedJob[];
  normalize: (jobs: ParsedJob[], normalizeSource: string) => NormalizedJob[];
};

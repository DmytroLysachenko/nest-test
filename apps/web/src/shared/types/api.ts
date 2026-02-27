export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
  meta?: {
    traceId?: string;
    timestamp?: string;
  };
};

export type UserDto = {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
};

export type ProfileInputDto = {
  id: string;
  userId: string;
  targetRoles: string;
  notes: string | null;
  intakePayload: {
    desiredPositions: string[];
    jobDomains: string[];
    coreSkills: string[];
    experienceYearsInRole: number | null;
    targetSeniority: Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>;
    workModePreferences: {
      hard: Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>;
      soft: Array<{ value: 'remote' | 'hybrid' | 'onsite' | 'mobile'; weight: number }>;
    };
    contractPreferences: {
      hard: Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>;
      soft: Array<{ value: 'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'; weight: number }>;
    };
    sectionNotes: {
      positions: string | null;
      domains: string | null;
      skills: string | null;
      experience: string | null;
      preferences: string | null;
    };
    generalNotes: string | null;
  } | null;
  normalizedInput?: {
    searchPreferences?: {
      sourceKind?: 'it' | 'general';
      seniority?: string[];
      workModes?: string[];
      employmentTypes?: string[];
      timeModes?: string[];
      salaryMin?: number | null;
      city?: string | null;
      radiusKm?: number | null;
      keywords?: string[];
    };
  } | null;
  createdAt: string;
};

export type OnboardingDraftDto = {
  id: string;
  userId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSummaryDto = {
  profile: {
    exists: boolean;
    status: string | null;
    version: number | null;
    updatedAt: string | null;
  };
  profileInput: {
    exists: boolean;
    updatedAt: string | null;
  };
  offers: {
    total: number;
    scored: number;
    lastUpdatedAt: string | null;
  };
  scrape: {
    lastRunStatus: string | null;
    lastRunAt: string | null;
    totalRuns: number;
  };
  workflow: {
    needsOnboarding: boolean;
  };
};

export type DocumentDto = {
  id: string;
  userId: string;
  type: 'CV' | 'LINKEDIN' | 'OTHER';
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string | null;
  extractedText: string | null;
  extractedAt: string | null;
  extractionStatus: 'PENDING' | 'READY' | 'FAILED';
  extractionError: string | null;
  createdAt: string;
};

export type DocumentEventDto = {
  id: string;
  documentId: string;
  userId: string;
  stage: string;
  status: 'INFO' | 'SUCCESS' | 'ERROR';
  message: string;
  errorCode: string | null;
  traceId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type DocumentUploadHealthDto = {
  traceId: string;
  ok: boolean;
  bucket: {
    ok: boolean;
    reason: string | null;
  };
  signedUrl: {
    ok: boolean;
    reason: string | null;
  };
};

export type DocumentDiagnosticsStageSummaryDto = {
  count: number;
  successRate: number;
  avgDurationMs: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
};

export type DocumentDiagnosticsSummaryDto = {
  windowHours: number;
  generatedAt: string;
  totals: {
    documentsWithMetrics: number;
    samples: number;
  };
  stages: {
    UPLOAD_CONFIRM: DocumentDiagnosticsStageSummaryDto;
    EXTRACTION: DocumentDiagnosticsStageSummaryDto;
    TOTAL_PIPELINE: DocumentDiagnosticsStageSummaryDto;
  };
};

export type CareerProfileDto = {
  id: string;
  userId: string;
  profileInputId: string;
  documentIds: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  content: string | null;
  contentJson: Record<string, unknown> | null;
  model: string | null;
  error: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CareerProfileListDto = {
  items: CareerProfileDto[];
  total: number;
  activeId: string | null;
  activeVersion: number | null;
  latestVersion: number | null;
};

export type CareerProfileSearchViewItemDto = {
  id: string;
  version: number;
  isActive: boolean;
  status: 'PENDING' | 'READY' | 'FAILED';
  primarySeniority: string | null;
  targetRoles: string[];
  searchableKeywords: string[];
  searchableTechnologies: string[];
  preferredWorkModes: string[];
  preferredEmploymentTypes: string[];
  createdAt: string;
  updatedAt: string;
};

export type CareerProfileSearchViewListDto = {
  items: CareerProfileSearchViewItemDto[];
  total: number;
};

export type CareerProfileQualitySignalDto = {
  key: string;
  status: 'ok' | 'weak' | 'missing';
  score: number;
  message: string;
};

export type CareerProfileQualityDto = {
  score: number;
  signals: CareerProfileQualitySignalDto[];
  missing: string[];
  recommendations: string[];
};

export type JobScoreResultDto = {
  score: number;
  matchedSkills: string[];
  matchedRoles: string[];
  explanation: {
    matchedSkills: string[];
    matchedRoles: string[];
    matchedStrengths: string[];
    matchedKeywords: string[];
  };
};

export type JobScoreResponseDto = {
  score: JobScoreResultDto;
  isMatch: boolean;
  profileId: string;
  profileVersion: number;
  matchId: string | null;
  matchedSkills: string[];
  matchedRoles: string[];
  explanation: JobScoreResultDto['explanation'];
  breakdown?: {
    skills: number;
    roles: number;
    strengths: number;
    keywords: number;
    seniority: number;
    workMode: number;
    employmentType: number;
    salary: number;
    location: number;
  };
  missingPreferences?: string[];
  matchMeta?: Record<string, unknown>;
  gaps: string[];
};

export type JobMatchListItemDto = {
  id: string;
  careerProfileId: string;
  profileVersion: number;
  score: number;
  minScore: number | null;
  isMatch: boolean;
  createdAt: string;
};

export type JobMatchListDto = {
  items: JobMatchListItemDto[];
  total: number;
};

export type JobSourceRunDto = {
  id: string;
  source: 'PRACUJ_PL';
  userId: string | null;
  careerProfileId: string | null;
  listingUrl: string;
  filters: Record<string, unknown> | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalFound: number | null;
  scrapedCount: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  finalizedAt?: string | null;
  failureType?: 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown' | null;
  retryOfRunId?: string | null;
  retryCount?: number;
  createdAt: string;
};

export type JobSourceRunDiagnosticsDto = {
  runId: string;
  source: string;
  status: string;
  listingUrl: string;
  finalizedAt: string | null;
  diagnostics: {
    relaxationTrail: string[];
    blockedUrls: string[];
    hadZeroOffersStep: boolean;
    stats: {
      totalFound: number | null;
      scrapedCount: number | null;
      pagesVisited: number;
      jobLinksDiscovered: number;
      blockedPages: number;
      skippedFreshUrls: number;
      dedupedInRunCount: number;
      ignoredRecommendedLinks: number;
    };
  };
};

export type JobSourceRunDiagnosticsSummaryDto = {
  windowHours: number;
  status: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  performance: {
    avgDurationMs: number | null;
    p95DurationMs: number | null;
    avgScrapedCount: number | null;
    avgTotalFound: number | null;
    successRate: number;
  };
  failures: {
    timeout: number;
    network: number;
    validation: number;
    parse: number;
    callback: number;
    unknown: number;
  };
  lifecycle: {
    reconciledStale: number;
    retriedRuns: number;
    retryCompleted: number;
  };
  timeline?: Array<{
    bucketStart: string;
    total: number;
    completed: number;
    failed: number;
    avgDurationMs: number | null;
    successRate: number;
  }>;
};

export type JobSourceRunsListDto = {
  items: JobSourceRunDto[];
  total: number;
};

export type EnqueueScrapeResponseDto = {
  ok: boolean;
  sourceRunId: string;
  status: string;
  acceptedAt?: string;
  warning?: string;
  inserted?: number;
  totalOffers?: number;
  reusedFromRunId?: string;
  droppedFilters?: Record<string, string[]>;
  acceptedFilters?: Record<string, unknown> | null;
  intentFingerprint?: string;
  resolvedFromProfile?: boolean;
  retriedFromRunId?: string;
  retryCount?: number;
};

export type JobOfferStatus = 'NEW' | 'SEEN' | 'SAVED' | 'APPLIED' | 'DISMISSED';

export type JobOfferListItemDto = {
  id: string;
  jobOfferId: string;
  sourceRunId: string | null;
  status: JobOfferStatus;
  matchScore: number | null;
  rankingScore?: number | null;
  explanationTags?: string[];
  matchMeta: Record<string, unknown> | null;
  notes: string | null;
  tags: string[] | null;
  statusHistory: Array<{ status: JobOfferStatus; changedAt: string }> | null;
  lastStatusAt: string | null;
  source: 'PRACUJ_PL' | string;
  url: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  employmentType: string | null;
  description: string;
  requirements: unknown | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type JobOffersListDto = {
  items: JobOfferListItemDto[];
  total: number;
  mode: 'strict' | 'approx' | 'explore';
  rankingMeta?: {
    mode: 'strict' | 'approx' | 'explore';
    tuning: {
      approxViolationPenalty: number;
      approxMaxViolationPenalty: number;
      approxScoredBonus: number;
      exploreUnscoredBase: number;
      exploreRecencyWeight: number;
    };
  };
};

export type JobOfferHistoryDto = {
  id: string;
  status: JobOfferStatus;
  statusHistory: Array<{ status: JobOfferStatus; changedAt: string }> | null;
  lastStatusAt: string | null;
  jobOfferId: string;
  title: string;
  company: string | null;
  url: string;
};

export type JobOfferScoreResultDto = {
  score: number;
  isMatch: boolean;
  matchMeta: Record<string, unknown>;
};

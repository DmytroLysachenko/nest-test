export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  requestId?: string;
  timestamp?: string;
  details?: string[];
  retryable?: boolean;
  category?: string;
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
  role?: string;
  permissions?: string[];
  lastLoginAt?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
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
    saved: number;
    applied: number;
    interviewing: number;
    offersMade: number;
    rejected: number;
    followUpDue: number;
    lastUpdatedAt: string | null;
  };
  documents: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
  };
  scrape: {
    lastRunStatus: string | null;
    lastRunAt: string | null;
    lastRunProgress: Record<string, unknown> | null;
    totalRuns: number;
  };
  workflow: {
    needsOnboarding: boolean;
  };
  nextAction: {
    key: string;
    title: string;
    description: string;
    href: string;
    priority: 'critical' | 'recommended' | 'info';
  };
  activity: Array<{
    key: string;
    label: string;
    timestamp: string | null;
    tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  }>;
  health: {
    readinessScore: number;
    blockers: string[];
    scrapeReliability: 'stable' | 'watch' | 'needs-attention';
  };
  readinessBreakdown: Array<{
    key: string;
    label: string;
    ready: boolean;
    detail: string;
  }>;
  blockerDetails: Array<{
    key: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
    blockedRoutes: string[];
  }>;
  recommendedSequence: string[];
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

export type DocumentRetryResultDto = {
  ok: true;
  document: DocumentDto;
  retry: {
    documentId: string;
    previousStatus: 'PENDING' | 'READY' | 'FAILED';
    previousError: string | null;
    message: string;
  };
};

export type RetryFailedDocumentsResultDto = {
  retried: number;
  failed: Array<{ documentId: string; error: string }>;
  totalFailed: number;
  remainingFailed: number;
  recovered: number;
  message: string;
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
  traceId?: string;
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
  silentFailure?: boolean;
  usefulOfferCount?: number;
  story?: {
    phase: 'completed' | 'partial' | 'blocked' | 'empty' | 'failed' | 'running' | 'queued';
    summary: string;
    recommendedAction: string;
    userVisibility: 'positive' | 'warning' | 'danger' | 'neutral';
  };
  retryOfRunId?: string | null;
  retryCount?: number;
  createdAt: string;
};

export type JobSourceHealthDto = {
  windowHours: number;
  items: Array<{
    source: string;
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    successRate: number;
    usableRunRate: number;
    avgUsefulOfferCount: number;
    timeoutFailures: number;
    callbackFailures: number;
    networkFailures: number;
    parseFailures: number;
    validationFailures: number;
    unknownFailures: number;
    staleHeartbeatRuns: number;
    degradedRuns: number;
    emptyRuns: number;
    failedQualityRuns: number;
    partialSuccessRuns: number;
    blockedOutcomeRuns: number;
    listingEmptyRuns: number;
    filtersExhaustedRuns: number;
    detailParseGapRuns: number;
    silentFailureRuns: number;
    latestRunAt: string | null;
    latestRunStatus: string | null;
  }>;
};

export type JobSourceRunDiagnosticsDto = {
  runId: string;
  traceId?: string;
  source: string;
  status: string;
  listingUrl: string;
  finalizedAt: string | null;
  heartbeatAt?: string | null;
  callbackAttempts?: number;
  callbackAcceptedAt?: string | null;
  reconcileReason?: string | null;
  lastEventAt?: string | null;
  progress?: Record<string, unknown> | null;
  story?: {
    phase: 'completed' | 'partial' | 'blocked' | 'empty' | 'failed' | 'running' | 'queued';
    summary: string;
    recommendedAction: string;
    userVisibility: 'positive' | 'warning' | 'danger' | 'neutral';
  };
  diagnostics: {
    relaxationTrail: string[];
    blockedUrls: string[];
    hadZeroOffersStep: boolean;
    resultKind?: string | null;
    emptyReason?: string | null;
    sourceQuality?: string | null;
    classifiedOutcome?: string | null;
    silentFailure?: boolean;
    artifacts?: {
      outputPath: string | null;
      retentionExpiresAt: string | null;
      rawPages: {
        count: number;
        directory: string | null;
        samplePaths: string[];
      };
      listing: {
        htmlPath: string | null;
        dataPath: string | null;
      };
    } | null;
    stageMetrics?: {
      fetch: {
        pagesVisited: number;
        jobLinksDiscovered: number;
        blockedPages: number;
        browserFallbacks: number;
        detailAttemptedCount: number;
      };
      parse: {
        acceptedOfferCount: number;
        rejectedOfferCount: number;
        dedupedInRunCount: number;
        salvagedOfferCount: number;
      };
      finalize: {
        blockedRate: number;
        attemptCount: number;
        stopReason: string | null;
        resultKind: string | null;
      };
    } | null;
    notebookVisibility?: {
      candidateOffers: number;
      matchedOffers: number;
      userInsertedOffers: number;
      hiddenByStrict: number;
      usefulOfferCount: number;
      listingsFound: number;
    };
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
    productivity?: {
      detailAttemptedCount: number;
      candidateOffers: number;
      matchedOffers: number;
      userInsertedOffers: number;
      degradedAcceptedOffers: number;
      acceptanceRatio: number | null;
      insertionRatio: number | null;
      stopReason: string | null;
    } | null;
  };
};

export type JobSourceRunEventDto = {
  id: string;
  sourceRunId: string;
  traceId: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error';
  requestId: string | null;
  phase: string | null;
  attemptNo: number | null;
  code: string | null;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type JobSourceRunEventsListDto = {
  items: JobSourceRunEventDto[];
  total: number;
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
    usableRunRate: number;
    avgUsefulOfferCount: number;
  };
  failures: {
    timeout: number;
    network: number;
    validation: number;
    parse: number;
    callback: number;
    unknown: number;
  };
  outcomes: {
    silentFailureCount: number;
    partialSuccessRuns: number;
    blockedRuns: number;
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
  traceId?: string;
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

export type ScrapePreflightDto = {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  source: string | null;
  listingUrl: string | null;
  acceptedFilters: Record<string, unknown> | null;
  resolvedFromProfile: boolean;
  activeRunCount: number;
  dailyRemaining: number | null;
  blockerDetails: Array<{
    code: string;
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  }>;
  warningDetails: Array<{
    code: string;
    title: string;
    description: string;
  }>;
  guidance: string;
  schedule: {
    enabled: boolean;
    cron: string | null;
    source: string | null;
    limit: number | null;
    nextRunAt: string | null;
    lastRunStatus: string | null;
  };
};

export type ScrapeScheduleDto = {
  enabled: boolean;
  cron: string;
  timezone: string;
  source: string;
  limit: number;
  careerProfileId: string | null;
  filters: Record<string, unknown> | null;
  lastTriggeredAt: string | null;
  nextRunAt: string | null;
  lastRunStatus: string | null;
};

export type JobOfferStatus =
  | 'NEW'
  | 'SEEN'
  | 'SAVED'
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'DISMISSED';

export type JobOfferListItemDto = {
  id: string;
  jobOfferId: string;
  sourceRunId: string | null;
  status: JobOfferStatus;
  matchScore: number | null;
  rankingScore?: number | null;
  explanationTags?: string[];
  followUpState?: 'due' | 'upcoming' | 'none';
  followUpAt?: string | null;
  nextStep?: string | null;
  followUpNote?: string | null;
  applicationUrl?: string | null;
  contactName?: string | null;
  lastFollowUpCompletedAt?: string | null;
  lastFollowUpSnoozedAt?: string | null;
  matchMeta: Record<string, unknown> | null;
  aiFeedbackScore: number | null;
  aiFeedbackNotes: string | null;
  pipelineMeta: Record<string, unknown> | null;
  prepMaterials: Record<string, unknown> | null;
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

export type DiscoveryJobOfferListItemDto = JobOfferListItemDto & {
  fitSummary: string | null;
  fitHighlights: string[];
  isInPipeline: boolean;
};

export type JobOffersListDto = {
  items: JobOfferListItemDto[];
  total: number;
  mode: 'strict' | 'approx' | 'explore';
  hiddenByModeCount: number;
  degradedResultCount: number;
  stateReasons?: string[];
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

export type DiscoveryJobOffersListDto = {
  items: DiscoveryJobOfferListItemDto[];
  total: number;
  mode: 'strict' | 'approx' | 'explore';
};

export type JobOfferSummaryDto = {
  total: number;
  scored: number;
  unscored: number;
  highConfidenceStrict: number;
  staleUntriaged: number;
  missingNextStep: number;
  stalePipeline: number;
  followUpDue: number;
  followUpUpcoming: number;
  buckets: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  topExplanationTags: Array<{
    tag: string;
    count: number;
  }>;
  quickActions: Array<{
    key: 'unscored' | 'strictTop' | 'saved' | 'applied' | 'staleUntriaged' | 'followUpDue' | 'followUpUpcoming';
    label: string;
    description: string;
    href: string;
    count: number;
  }>;
};

export type DiscoverySummaryDto = {
  total: number;
  unseen: number;
  reviewed: number;
  inPipeline: number;
  buckets: Array<{
    key: string;
    label: string;
    count: number;
  }>;
};

export type JobOfferFocusDto = {
  groups: Array<{
    key: string;
    label: string;
    description: string;
    href: string;
    count: number;
    items: Array<{
      id: string;
      title: string;
      company: string | null;
      location: string | null;
      matchScore: number | null;
      followUpState: 'due' | 'upcoming' | 'none';
    }>;
  }>;
};

export type JobOfferActionPlanDto = {
  buckets: Array<{
    key: 'due-now' | 'scheduled-soon' | 'missing-next-step' | 'stale-active' | 'strict-top-unreviewed' | string;
    label: string;
    description: string;
    href: string;
    count: number;
    ctaLabel: string;
    reasons?: string[];
  }>;
};

export type JobOfferPrepPacketDto = {
  offer: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    url: string | null;
    description: string | null;
    requirements: unknown | null;
  };
  matchRationale: Record<string, unknown> | null;
  tags: string[];
  notes: string | null;
  followUpState: 'due' | 'upcoming' | 'none';
  followUpAt: string | null;
  nextStep: string | null;
  followUpNote: string | null;
  applicationUrl: string | null;
  contactName: string | null;
  prepMaterials: Record<string, unknown> | null;
  profile: {
    headline: string | null;
    summary: string | null;
    targetRoles: string[];
    searchableKeywords: string[];
  } | null;
  talkingPoints: string[];
  verifyBeforeReply: string[];
};

export type NotebookFiltersDto = {
  status: 'ALL' | JobOfferStatus;
  mode: 'strict' | 'approx' | 'explore';
  view: 'LIST' | 'PIPELINE';
  search: string;
  tag: string;
  hasScore: 'all' | 'yes' | 'no';
  followUp: 'all' | 'due' | 'upcoming' | 'none';
  attention: 'all' | 'staleUntriaged' | 'missingNextStep' | 'stalePipeline';
};

export type NotebookPreferencesDto = {
  id: string;
  userId: string;
  filters: NotebookFiltersDto;
  savedPreset: NotebookFiltersDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CallbackEventsListDto = {
  items: Array<{
    id: string;
    sourceRunId: string;
    eventId: string;
    attemptNo: number | null;
    payloadHash: string | null;
    status: string;
    emittedAt: string | null;
    receivedAt: string | null;
    requestId?: string | null;
  }>;
  limit: number;
  offset: number;
};

export type ApiRequestEventDto = {
  id: string;
  userId: string | null;
  requestId: string | null;
  level: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  errorCode: string | null;
  details: string[] | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type ApiRequestEventsListDto = {
  items: ApiRequestEventDto[];
  limit: number;
  offset: number;
  total: number;
  statusSummary: Array<{
    statusCode: number;
    count: number;
  }>;
};

export type AuthorizationEventDto = {
  id: string;
  userId: string | null;
  role: string | null;
  permission: string | null;
  resource: string | null;
  action: string;
  outcome: string;
  requestId: string | null;
  method: string | null;
  path: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type AuthorizationEventsListDto = {
  items: AuthorizationEventDto[];
  limit: number;
  offset: number;
  total: number;
};

export type SupportOverviewDto = {
  generatedAt: string;
  windowHours: number;
  metrics: {
    windowHours: number;
    queue: {
      activeRuns: number;
      pendingRuns: number;
      runningRuns: number;
      runningWithoutHeartbeat: number;
    };
    scrape: {
      totalRuns: number;
      completedRuns: number;
      failedRuns: number;
      successRate: number;
    };
    offers: {
      totalUserOffers: number;
      unscoredUserOffers: number;
    };
    lifecycle: {
      staleReconciledRuns: number;
      retriesTriggered: number;
      retrySuccessRate: number;
    };
    callback: {
      totalEvents: number;
      completedEvents: number;
      failedEvents: number;
      failedRate: number;
      failuresByType: Record<string, number>;
      failuresByCode: Record<string, number>;
      retryRate24h: number;
      conflictingPayloadEvents24h: number;
    };
    scheduler: {
      lastTriggerAt: string | null;
      dueSchedules: number;
      enqueueFailures24h: number;
    };
  };
  recentFailures: {
    scrapeRuns: Array<{
      id: string;
      traceId: string;
      userId: string | null;
      source: string;
      status: string;
      failureType: string | null;
      error: string | null;
      lastHeartbeatAt: string | null;
      finalizedAt: string | null;
      createdAt: string;
    }>;
    callbackEvents: Array<{
      id: string;
      sourceRunId: string;
      eventId: string;
      requestId: string | null;
      attemptNo: number | null;
      status: string;
      payloadHash: string | null;
      receivedAt: string | null;
    }>;
    apiRequests: Array<{
      id: string;
      userId: string | null;
      requestId: string | null;
      level: string;
      method: string;
      path: string;
      statusCode: number;
      message: string;
      errorCode: string | null;
      createdAt: string;
    }>;
    scheduleExecutions: Array<{
      id: string;
      scheduleId: string;
      userId: string;
      sourceRunId: string | null;
      traceId: string | null;
      requestId: string | null;
      eventType: string;
      severity: string;
      code: string | null;
      message: string;
      createdAt: string;
    }>;
    authorizationEvents: AuthorizationEventDto[];
  };
  stageFailures?: Array<{
    stage: string;
    status: string;
    count: number;
  }>;
};

export type SupportScrapeForensicsDto = {
  run: {
    id: string;
    traceId: string;
    status: string;
    failureType: string | null;
    error: string | null;
    createdAt: string;
  };
  stageSummary: Record<string, { total: number; failed: number; warning: number }>;
  executionEvents: Array<{
    id: string;
    sourceRunId: string;
    traceId: string | null;
    requestId: string | null;
    stage: string;
    status: string;
    code: string | null;
    message: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
  runEvents: Array<{
    id: string;
    sourceRunId: string;
    traceId: string;
    eventType: string;
    severity: string;
    requestId: string | null;
    phase: string | null;
    attemptNo: number | null;
    code: string | null;
    message: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
  callbackEvents: Array<{
    id: string;
    eventId: string;
    status: string;
    requestId: string | null;
    attemptNo: number | null;
    receivedAt: string;
    payloadSummary: Record<string, unknown> | null;
  }>;
};

export type SupportScrapeIncidentDto = {
  generatedAt: string;
  run: {
    id: string;
    traceId: string;
    source: string;
    userId: string | null;
    listingUrl: string;
    filters: Record<string, unknown> | null;
    status: string;
    failureType: string | null;
    error: string | null;
    totalFound: number | null;
    scrapedCount: number | null;
    lastHeartbeatAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    finalizedAt: string | null;
    createdAt: string;
  };
  signals: {
    lastHeartbeatAt: string | null;
    lastTimelineEventAt: string | null;
    reconcileReason: string | null;
    likelyFailureStage: string;
  };
  callbackSummary: {
    totalEvents: number;
    failedEvents: number;
    latestReceivedAt: string | null;
    latestAcceptedRequestId: string | null;
  };
  timeline: Array<{
    id: string;
    eventType: string;
    severity: string;
    requestId: string | null;
    phase: string | null;
    attemptNo: number | null;
    code: string | null;
    message: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
  callbackEvents: Array<{
    id: string;
    eventId: string;
    requestId: string | null;
    attemptNo: number | null;
    status: string;
    payloadHash: string | null;
    emittedAt: string | null;
    receivedAt: string | null;
    payloadSummary: Record<string, unknown> | null;
  }>;
  apiRequestEvents: ApiRequestEventDto[];
};

export type SupportUserIncidentDto = {
  generatedAt: string;
  windowHours: number;
  user: {
    id: string;
    email: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    deletedAt: string | null;
  };
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
    source: string;
    limit: number;
    nextRunAt: string | null;
    lastTriggeredAt: string | null;
    lastRunStatus: string | null;
    filters: Record<string, unknown> | null;
  } | null;
  offerStats: {
    totalOffers: number;
    unscoredOffers: number;
    statusCounts: Record<string, number>;
  };
  recentScrapeRuns: Array<{
    id: string;
    traceId: string;
    source: string;
    status: string;
    failureType: string | null;
    error: string | null;
    finalizedAt: string | null;
    createdAt: string;
  }>;
  recentScheduleEvents: Array<{
    id: string;
    scheduleId: string;
    sourceRunId: string | null;
    traceId: string | null;
    requestId: string | null;
    eventType: string;
    severity: string;
    code: string | null;
    message: string;
    createdAt: string;
  }>;
  recentApiRequestEvents: ApiRequestEventDto[];
};

export type SupportScheduleEventsListDto = {
  items: Array<{
    id: string;
    scheduleId: string;
    userId: string;
    sourceRunId: string | null;
    traceId: string | null;
    requestId: string | null;
    eventType: string;
    severity: string;
    code: string | null;
    message: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
  limit: number;
  offset: number;
  total: number;
};

export type SupportCorrelationDto = {
  generatedAt: string;
  requestId: string | null;
  traceId: string | null;
  sourceRunId: string | null;
  userId: string | null;
  matches: Array<{
    kind: string;
    id: string;
    requestId: string | null;
    traceId: string | null;
    sourceRunId: string | null;
    userId: string | null;
    summary: Record<string, unknown> | null;
    createdAt: string;
  }>;
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

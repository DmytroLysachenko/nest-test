export const queryKeys = {
  auth: {
    me: (token: string | null) => ['auth', 'me', token] as const,
  },
  profileInputs: {
    latest: (token: string | null) => ['profile-inputs', 'latest', token] as const,
  },
  documents: {
    list: (token: string | null) => ['documents', token] as const,
    diagnosticsSummary: (token: string | null, windowHours: number) =>
      ['documents', 'diagnostics-summary', token, windowHours] as const,
    events: (token: string | null, documentId: string | null) => ['documents', 'events', token, documentId] as const,
  },
  careerProfiles: {
    latest: (token: string | null) => ['career-profiles', 'latest', token] as const,
    quality: (token: string | null) => ['career-profiles', 'quality', token] as const,
    versions: (token: string | null, limit: number, offset: number) =>
      ['career-profiles', 'versions', token, limit, offset] as const,
    searchView: (
      token: string | null,
      params: {
        status?: string;
        isActive?: boolean;
        seniority?: string;
        role?: string;
        keyword?: string;
        technology?: string;
        limit?: number;
        offset?: number;
      },
    ) => ['career-profiles', 'search-view', token, params] as const,
  },
  workflow: {
    summary: (token: string | null) => ['workflow', 'summary', token] as const,
  },
  onboarding: {
    draft: (token: string | null) => ['onboarding', 'draft', token] as const,
  },
  jobSources: {
    runs: (
      token: string | null,
      params?: {
        status?: string;
        failureType?: string;
        source?: string;
        retriedFrom?: string;
        limit?: number;
        offset?: number;
        windowHours?: number;
        includeRetried?: boolean;
      },
    ) => ['job-sources', 'runs', token, params] as const,
    diagnosticsSummary: (token: string | null, windowHours: number) =>
      ['job-sources', 'diagnostics-summary', token, windowHours] as const,
    sourceHealth: (token: string | null, windowHours: number) =>
      ['job-sources', 'source-health', token, windowHours] as const,
    schedule: (token: string | null) => ['job-sources', 'schedule', token] as const,
    preflight: (token: string | null, params?: Record<string, unknown>) =>
      ['job-sources', 'preflight', token, params] as const,
  },
  jobOffers: {
    list: (
      token: string | null,
      params: {
        limit?: number;
        offset?: number;
        status?: string;
        mode?: 'strict' | 'approx' | 'explore';
        minScore?: number;
        search?: string;
        tag?: string;
        hasScore?: boolean;
        followUp?: 'due' | 'upcoming' | 'none';
      },
    ) => ['job-offers', token, params] as const,
    history: (token: string | null, offerId: string | null) => ['job-offers', 'history', token, offerId] as const,
    preferences: (token: string | null) => ['job-offers', 'preferences', token] as const,
    summary: (token: string | null) => ['job-offers', 'summary', token] as const,
    focus: (token: string | null) => ['job-offers', 'focus', token] as const,
  },
  ops: {
    callbackEvents: (
      token: string | null,
      params: { status?: string; sourceRunId?: string; limit?: number; offset?: number },
    ) => ['ops', 'callback-events', token, params] as const,
  },
  jobMatching: {
    list: (token: string | null) => ['job-matching', token] as const,
  },
};

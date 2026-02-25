export const queryKeys = {
  auth: {
    me: (token: string | null) => ['auth', 'me', token] as const,
  },
  profileInputs: {
    latest: (token: string | null) => ['profile-inputs', 'latest', token] as const,
  },
  documents: {
    list: (token: string | null) => ['documents', token] as const,
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
    runs: (token: string | null) => ['job-sources', 'runs', token] as const,
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
      },
    ) => ['job-offers', token, params] as const,
    history: (token: string | null, offerId: string | null) => ['job-offers', 'history', token, offerId] as const,
  },
  jobMatching: {
    list: (token: string | null) => ['job-matching', token] as const,
  },
};

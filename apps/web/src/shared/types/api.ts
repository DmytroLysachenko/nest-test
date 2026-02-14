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
  createdAt: string;
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
  createdAt: string;
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
};

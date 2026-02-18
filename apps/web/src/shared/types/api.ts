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
  droppedFilters?: Record<string, string[]>;
};

export type JobOfferStatus = 'NEW' | 'SEEN' | 'SAVED' | 'APPLIED' | 'DISMISSED';

export type JobOfferListItemDto = {
  id: string;
  jobOfferId: string;
  sourceRunId: string | null;
  status: JobOfferStatus;
  matchScore: number | null;
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

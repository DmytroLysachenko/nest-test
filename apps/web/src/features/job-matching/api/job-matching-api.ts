import { apiRequest } from '@/shared/lib/http/api-client';

import type { JobMatchListDto, JobScoreResponseDto } from '@/shared/types/api';

type ScoreJobPayload = {
  jobDescription: string;
  minScore?: number;
};

export const scoreJob = (token: string, payload: ScoreJobPayload) =>
  apiRequest<JobScoreResponseDto>('/job-matching/score', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const getJobMatchHistory = (token: string) =>
  apiRequest<JobMatchListDto>('/job-matching', {
    method: 'GET',
    token,
  });

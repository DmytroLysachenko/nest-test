import { apiRequest } from '@/shared/lib/http/api-client';

import type { CareerProfileDto } from '@/shared/types/api';

type GenerateCareerProfilePayload = {
  instructions?: string;
};

export const generateCareerProfile = (token: string, payload: GenerateCareerProfilePayload) =>
  apiRequest<CareerProfileDto>('/career-profiles', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const getLatestCareerProfile = (token: string) =>
  apiRequest<CareerProfileDto | null>('/career-profiles/latest', {
    method: 'GET',
    token,
  }).then((data) => data ?? null);

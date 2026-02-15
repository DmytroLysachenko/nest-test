import { apiRequest } from '@/shared/lib/http/api-client';

import type { ProfileInputDto } from '@/shared/types/api';

type CreateProfileInputPayload = {
  targetRoles: string;
  notes?: string;
};

export const createProfileInput = (token: string, payload: CreateProfileInputPayload) =>
  apiRequest<ProfileInputDto>('/profile-inputs', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const getLatestProfileInput = (token: string) =>
  apiRequest<ProfileInputDto | null>('/profile-inputs/latest', {
    method: 'GET',
    token,
  }).then((data) => data ?? null);

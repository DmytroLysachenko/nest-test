import { apiRequest } from '@/shared/lib/http/api-client';

import type { OnboardingDraftDto } from '@/shared/types/api';

export const getOnboardingDraft = (token: string) =>
  apiRequest<OnboardingDraftDto | null>('/onboarding/draft', {
    method: 'GET',
    token,
  }).then((value) => value ?? null);

export const upsertOnboardingDraft = (token: string, payload: Record<string, unknown>) =>
  apiRequest<OnboardingDraftDto>('/onboarding/draft', {
    method: 'PUT',
    token,
    body: JSON.stringify({ payload }),
  });

export const deleteOnboardingDraft = (token: string) =>
  apiRequest<{ ok: boolean }>('/onboarding/draft', {
    method: 'DELETE',
    token,
  });

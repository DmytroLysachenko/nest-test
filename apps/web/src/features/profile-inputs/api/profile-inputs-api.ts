import { apiRequest } from '@/shared/lib/http/api-client';

import type { ProfileInputDto } from '@/shared/types/api';

export type CreateProfileInputPayload = {
  targetRoles?: string;
  notes?: string;
  intakePayload?: {
    desiredPositions: string[];
    jobDomains?: string[];
    coreSkills?: string[];
    experienceYearsInRole?: number;
    targetSeniority?: Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>;
    workModePreferences?: {
      hard: Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>;
      soft: Array<{ value: 'remote' | 'hybrid' | 'onsite' | 'mobile'; weight: number }>;
    };
    contractPreferences?: {
      hard: Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>;
      soft: Array<{ value: 'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'; weight: number }>;
    };
    sectionNotes?: {
      positions?: string;
      domains?: string;
      skills?: string;
      experience?: string;
      preferences?: string;
    };
    generalNotes?: string;
  };
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

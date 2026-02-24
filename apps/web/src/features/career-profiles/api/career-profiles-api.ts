import { apiRequest } from '@/shared/lib/http/api-client';

import type {
  CareerProfileDto,
  CareerProfileListDto,
  CareerProfileQualityDto,
  CareerProfileSearchViewListDto,
  DocumentDto,
} from '@/shared/types/api';

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

export const getCareerProfileQuality = (token: string) =>
  apiRequest<CareerProfileQualityDto>('/career-profiles/quality', {
    method: 'GET',
    token,
  });

export const listCareerProfileVersions = (
  token: string,
  params: {
    limit?: number;
    offset?: number;
    status?: 'PENDING' | 'READY' | 'FAILED';
    isActive?: boolean;
  } = {},
) => {
  const query = new URLSearchParams();
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.isActive !== undefined) {
    query.set('isActive', String(params.isActive));
  }

  const value = query.toString();
  return apiRequest<CareerProfileListDto>(value ? `/career-profiles?${value}` : '/career-profiles', {
    method: 'GET',
    token,
  });
};

export const restoreCareerProfileVersion = (token: string, id: string) =>
  apiRequest<CareerProfileDto>(`/career-profiles/${id}/restore`, {
    method: 'POST',
    token,
  });

export const listCareerProfileDocuments = (token: string, id: string) =>
  apiRequest<DocumentDto[]>(`/career-profiles/${id}/documents`, {
    method: 'GET',
    token,
  });

type CareerProfilesSearchViewFilters = {
  status?: 'PENDING' | 'READY' | 'FAILED';
  isActive?: boolean;
  seniority?: string;
  role?: string;
  keyword?: string;
  technology?: string;
  limit?: number;
  offset?: number;
};

export const getCareerProfilesSearchView = (token: string, filters: CareerProfilesSearchViewFilters) => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.isActive !== undefined) {
    params.set('isActive', String(filters.isActive));
  }
  if (filters.seniority) {
    params.set('seniority', filters.seniority);
  }
  if (filters.role) {
    params.set('role', filters.role);
  }
  if (filters.keyword) {
    params.set('keyword', filters.keyword);
  }
  if (filters.technology) {
    params.set('technology', filters.technology);
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(filters.limit));
  }
  if (filters.offset !== undefined) {
    params.set('offset', String(filters.offset));
  }

  const query = params.toString();
  const path = query ? `/career-profiles/search-view?${query}` : '/career-profiles/search-view';

  return apiRequest<CareerProfileSearchViewListDto>(path, {
    method: 'GET',
    token,
  });
};

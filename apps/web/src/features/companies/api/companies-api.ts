import { apiRequest } from '@/shared/lib/http/api-client';

import type { CompanyDetailDto, CompaniesListDto } from '@/shared/types/api';

export type ListCompaniesParams = {
  search?: string;
  location?: string;
  limit?: number;
  offset?: number;
};

const toQuery = (params: ListCompaniesParams) => {
  const query = new URLSearchParams();
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.location) {
    query.set('location', params.location);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const value = query.toString();
  return value ? `?${value}` : '';
};

export const listCompanies = (token: string, params: ListCompaniesParams = {}) =>
  apiRequest<CompaniesListDto>(`/companies${toQuery(params)}`, {
    method: 'GET',
    token,
  });

export const getCompanyDetail = (token: string, id: string) =>
  apiRequest<CompanyDetailDto>(`/companies/${id}`, {
    method: 'GET',
    token,
  });

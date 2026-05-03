import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompaniesPage } from '@/features/companies/ui/companies-page';
import { useCompaniesPage } from '@/features/companies/model/use-companies-page';

vi.mock('@/features/companies/model/use-companies-page', () => ({
  useCompaniesPage: vi.fn(),
}));

const mockedUseCompaniesPage = vi.mocked(useCompaniesPage);

const createCompaniesState = (overrides: Record<string, unknown> = {}) => ({
  listQuery: {
    data: {
      items: [],
      total: 0,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  search: '',
  location: '',
  page: 1,
  offset: 0,
  total: 0,
  setSearch: vi.fn(),
  setLocation: vi.fn(),
  setPage: vi.fn(),
  resetFilters: vi.fn(),
  canPrev: false,
  canNext: false,
  ...overrides,
});

describe('CompaniesPage', () => {
  it('shows route-specific skeletons while loading', () => {
    mockedUseCompaniesPage.mockReturnValue(
      createCompaniesState({
        listQuery: {
          data: undefined,
          isLoading: true,
          error: null,
          refetch: vi.fn(),
        },
      }) as unknown as ReturnType<typeof useCompaniesPage>,
    );

    render(<CompaniesPage token="token" />);

    expect(screen.getByText('Browse employers already in your workspace')).toBeInTheDocument();
    expect(screen.getByText('Filter employers by name, description, or location')).toBeInTheDocument();
  });

  it('renders flatter company research cards when results exist', () => {
    mockedUseCompaniesPage.mockReturnValue(
      createCompaniesState({
        listQuery: {
          data: {
            items: [
              {
                id: 'company-1',
                canonicalName: 'OpenAI',
                description: 'AI research and products.',
                activeOfferCount: 3,
                totalOfferCount: 5,
                hqLocation: 'San Francisco',
                lastSeenAt: '2026-05-02T10:00:00.000Z',
                websiteUrl: 'https://openai.com',
                sourceProfileUrl: 'https://example.com/openai',
              },
            ],
            total: 1,
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        },
        total: 1,
      }) as unknown as ReturnType<typeof useCompaniesPage>,
    );

    render(<CompaniesPage token="token" />);

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Company research')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open details/i })).toBeInTheDocument();
  });

  it('shows empty-state guidance when no companies match the filters', () => {
    mockedUseCompaniesPage.mockReturnValue(createCompaniesState() as unknown as ReturnType<typeof useCompaniesPage>);

    render(<CompaniesPage token="token" />);

    expect(screen.getByText('No companies found')).toBeInTheDocument();
    expect(screen.getByText('Try a broader name or clear the location filter.')).toBeInTheDocument();
  });
});

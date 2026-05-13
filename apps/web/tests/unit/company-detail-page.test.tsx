import React from 'react';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { CompanyDetailPage } from '@/features/companies/ui/company-detail-page';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const mockedUseQuery = vi.mocked(useQuery);

describe('CompanyDetailPage', () => {
  it('shows route-specific skeleton while loading', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<CompanyDetailPage token="token" companyId="company-1" />);

    expect(screen.getByText('Company detail')).toBeInTheDocument();
  });

  it('renders flatter company context and linked offer sections', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        id: 'company-1',
        canonicalName: 'OpenAI',
        description: 'AI systems and products.',
        activeOfferCount: 2,
        totalOfferCount: 4,
        hqLocation: 'San Francisco',
        lastSeenAt: '2026-05-02T10:00:00.000Z',
        websiteUrl: 'https://openai.com',
        sourceProfileUrl: 'https://example.com/openai',
        recentOffers: [
          {
            id: 'offer-1',
            title: 'Frontend Engineer',
            location: 'Remote',
            salary: '$100k',
            isExpired: false,
            expiresAt: '2026-05-10T10:00:00.000Z',
            url: 'https://example.com/offer-1',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<CompanyDetailPage token="token" companyId="company-1" />);

    expect(screen.getByText('Company context')).toBeInTheDocument();
    expect(screen.getByText('Best use')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open listing/i })).toBeInTheDocument();
  });

  it('hides suspicious scraped salary and location pollution', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        id: 'company-1',
        canonicalName: 'Capgemini Polska',
        description: 'Consulting and engineering.',
        activeOfferCount: 1,
        totalOfferCount: 1,
        hqLocation: 'Warsaw',
        lastSeenAt: '2026-05-12T10:00:00.000Z',
        websiteUrl: 'https://example.com',
        sourceProfileUrl: null,
        recentOffers: [
          {
            id: 'offer-1',
            title: 'Senior Software Engineer',
            location: 'Gdansk Superoferta Podobne oferty',
            salary: '130-173 zl Gdansk Superoferta Wlacz powiadomienie Podobne oferty Senior Software Engineer',
            isExpired: false,
            expiresAt: null,
            url: 'https://example.com/offer-1',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<CompanyDetailPage token="token" companyId="company-1" />);

    expect(screen.getByText('Location not specified')).toBeInTheDocument();
    expect(screen.queryByText(/Superoferta/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /more in/i })).not.toBeInTheDocument();
  });

  it('shows fallback empty state when the company record is missing', () => {
    mockedUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<CompanyDetailPage token="token" companyId="missing-company" />);

    expect(screen.getByText('Company not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to companies/i })).toBeInTheDocument();
  });
});

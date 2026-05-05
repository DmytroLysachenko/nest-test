import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCompaniesPage } from '@/features/companies/model/use-companies-page';
import { listCompanies } from '@/features/companies/api/companies-api';

const replaceMock = vi.fn();
let mockedSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/companies',
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => mockedSearchParams,
}));

vi.mock('@/features/companies/api/companies-api', () => ({
  listCompanies: vi.fn(),
}));

const mockedListCompanies = vi.mocked(listCompanies);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function CompaniesPageQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return CompaniesPageQueryWrapper;
};

const CompaniesPageQueryWrapper = createWrapper();

describe('useCompaniesPage', () => {
  beforeEach(() => {
    mockedSearchParams = new URLSearchParams();
    replaceMock.mockReset();
    mockedListCompanies.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('hydrates initial route state and queries the corresponding page slice', async () => {
    mockedSearchParams = new URLSearchParams('search=React&location=Warsaw&page=2');

    const { result } = renderHook(
      () =>
        useCompaniesPage({
          token: 'token',
          initialSearch: 'React',
          initialLocation: 'Warsaw',
          initialPage: 2,
        }),
      {
        wrapper: CompaniesPageQueryWrapper,
      },
    );

    await waitFor(() => expect(result.current.page).toBe(2));

    expect(result.current.search).toBe('React');
    expect(result.current.location).toBe('Warsaw');
    expect(mockedListCompanies).toHaveBeenCalledWith('token', {
      search: 'React',
      location: 'Warsaw',
      limit: 20,
      offset: 20,
    });
  });

  it('debounces free-text filters before syncing them to the route query', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useCompaniesPage({ token: 'token' }), {
      wrapper: CompaniesPageQueryWrapper,
    });

    act(() => {
      result.current.setSearch('  Product   ');
      result.current.setLocation('  Berlin ');
    });

    expect(replaceMock).not.toHaveBeenCalledWith('/companies?search=Product&location=Berlin', { scroll: false });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(replaceMock).toHaveBeenCalledWith('/companies?search=Product&location=Berlin', { scroll: false });
  });

  it('resets back to the first page when debounced filters change', async () => {
    vi.useFakeTimers();
    mockedSearchParams = new URLSearchParams('page=3');

    const { result } = renderHook(
      () =>
        useCompaniesPage({
          token: 'token',
          initialPage: 3,
        }),
      {
        wrapper: CompaniesPageQueryWrapper,
      },
    );

    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setSearch('platform');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.page).toBe(1);
  });
});

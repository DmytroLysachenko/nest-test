import { act, renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOpportunitiesPage } from '@/features/job-offers/model/use-opportunities-page';
import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';

const replaceMock = vi.fn();
let mockedSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/opportunities',
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => mockedSearchParams,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('@/features/job-offers/model/hooks/use-notebook-mutations', () => ({
  useNotebookMutations: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseNotebookMutations = vi.mocked(useNotebookMutations);
let discoveryData: {
  items: Array<{ id: string; status: string; isInPipeline: boolean; fitHighlights: string[] }>;
  total: number;
};
let summaryData: { unseen: number; reviewed: number; inPipeline: number };

const createQueryResult = (data: unknown) =>
  ({
    data,
    isError: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    dataUpdatedAt: Date.now(),
  }) as unknown as ReturnType<typeof useQuery>;

describe('useOpportunitiesPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearchParams = new URLSearchParams();
    replaceMock.mockReset();
    discoveryData = {
      items: [
        {
          id: 'offer-1',
          status: 'NEW',
          isInPipeline: false,
          fitHighlights: [],
        },
      ],
      total: 1,
    };
    summaryData = {
      unseen: 1,
      reviewed: 0,
      inPipeline: 0,
    };
    mockedUseNotebookMutations.mockReturnValue({
      statusMutation: { mutate: vi.fn(), isPending: false },
    } as unknown as ReturnType<typeof useNotebookMutations>);
    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) =>
      options.queryKey[1] === 'discovery' ? createQueryResult(discoveryData) : createQueryResult(summaryData),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('writes debounced free-text filters back into the opportunities url query', async () => {
    const { result } = renderHook(() =>
      useOpportunitiesPage({
        token: 'token',
      }),
    );

    act(() => {
      result.current.setSearch('  React  ');
      result.current.setTag(' frontend ');
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(replaceMock).toHaveBeenCalledWith('/opportunities?search=React&tag=frontend', { scroll: false });
  });

  it('defaults review mode to approx and keeps the url clean for that default', () => {
    const { result } = renderHook(() =>
      useOpportunitiesPage({
        token: 'token',
      }),
    );

    expect(result.current.mode).toBe('approx');
    expect(replaceMock).not.toHaveBeenCalledWith(expect.stringContaining('mode='), expect.anything());
  });

  it('keeps page and per-page state shareable through the route query', async () => {
    discoveryData = { items: [], total: 40 };
    summaryData = { unseen: 0, reviewed: 0, inPipeline: 0 };

    const { result } = renderHook(() =>
      useOpportunitiesPage({
        token: 'token',
        initialPage: 2,
        initialPerPage: 30,
      }),
    );

    act(() => {
      result.current.setSelectedId('offer-22');
      result.current.setPage(3);
    });

    expect(replaceMock).toHaveBeenCalledWith('/opportunities?page=3&perPage=30&offerId=offer-22', {
      scroll: false,
    });
  });

  it('resets pagination when per-page changes', () => {
    const { result } = renderHook(() =>
      useOpportunitiesPage({
        token: 'token',
        initialPage: 3,
      }),
    );

    act(() => {
      result.current.setPerPage(10);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.perPage).toBe(10);
  });
});

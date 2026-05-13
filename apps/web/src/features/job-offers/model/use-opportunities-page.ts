'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { getDiscoverySummary, listDiscoveryJobOffers } from '@/features/job-offers/api/job-offers-api';
import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { useDebouncedValue } from '@/shared/lib/hooks/use-debounced-value';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableRouteQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toOptionalTrimmedString } from '@/shared/lib/utils/input-normalizers';
import { buildPathWithQuery } from '@/shared/lib/utils/url-normalizers';

import type { DiscoveryQuickActionKey } from '@/features/job-offers/model/types/notebook-view-model';

type UseOpportunitiesPageArgs = {
  token: string;
  initialQuickAction?: DiscoveryQuickActionKey | null;
  initialOfferId?: string | null;
  initialMode?: 'strict' | 'approx' | 'explore';
  initialHasScore?: 'all' | 'yes' | 'no';
  initialSearch?: string;
  initialTag?: string;
  initialPage?: number;
  initialPerPage?: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const PER_PAGE_OPTIONS = [10, 20, 30, 50] as const;

export const useOpportunitiesPage = ({
  token,
  initialQuickAction = null,
  initialOfferId = null,
  initialMode = 'approx',
  initialHasScore = 'all',
  initialSearch = '',
  initialTag = '',
  initialPage = DEFAULT_PAGE,
  initialPerPage = DEFAULT_PER_PAGE,
}: UseOpportunitiesPageArgs) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'strict' | 'approx' | 'explore'>(
    initialQuickAction === 'strictTop' || initialQuickAction === 'staleUntriaged' ? 'strict' : initialMode,
  );
  const [hasScore, setHasScore] = useState<'all' | 'yes' | 'no'>(
    initialQuickAction === 'unscored' ? 'no' : initialHasScore,
  );
  const [search, setSearch] = useState(initialSearch);
  const [tag, setTag] = useState(initialTag);
  const [page, setPage] = useState(Math.max(DEFAULT_PAGE, initialPage));
  const [perPage, setPerPage] = useState(
    PER_PAGE_OPTIONS.includes(initialPerPage as (typeof PER_PAGE_OPTIONS)[number]) ? initialPerPage : DEFAULT_PER_PAGE,
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialOfferId);
  const didHydrateFiltersRef = useRef(false);
  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedTag = useDebouncedValue(tag, 400);
  const offset = (page - 1) * perPage;
  const normalizedSearch = toOptionalTrimmedString(debouncedSearch);
  const normalizedTag = toOptionalTrimmedString(debouncedTag);

  const listParams = useMemo(
    () => ({
      limit: perPage,
      offset,
      mode,
      search: normalizedSearch,
      tag: normalizedTag,
      hasScore: hasScore === 'all' ? undefined : hasScore === 'yes',
    }),
    [hasScore, mode, normalizedSearch, normalizedTag, offset, perPage],
  );

  useEffect(() => {
    if (!didHydrateFiltersRef.current) {
      didHydrateFiltersRef.current = true;
      return;
    }

    setPage(DEFAULT_PAGE);
  }, [mode, hasScore, normalizedSearch, normalizedTag]);

  useEffect(() => {
    const nextPath = buildPathWithQuery(pathname, {
      mode: mode !== 'approx' ? mode : null,
      hasScore: hasScore !== 'all' ? hasScore : null,
      search: normalizedSearch,
      tag: normalizedTag,
      page: page > DEFAULT_PAGE ? page : null,
      perPage: perPage !== DEFAULT_PER_PAGE ? perPage : null,
      offerId: selectedId,
    });
    const currentPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    if (nextPath !== currentPath) {
      router.replace(nextPath, { scroll: false });
    }
  }, [pathname, router, searchParams, mode, hasScore, normalizedSearch, normalizedTag, page, perPage, selectedId]);

  const listQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.discovery(token, listParams),
      queryFn: (authToken) => listDiscoveryJobOffers(authToken, listParams),
      ...mutableRouteQueryPreset(),
    }),
  );

  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.discoverySummary(token),
      queryFn: getDiscoverySummary,
      ...mutableRouteQueryPreset(),
    }),
  );

  const selectedOffer = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [listQuery.data?.items, selectedId],
  );

  useEffect(() => {
    const items = listQuery.data?.items ?? [];
    if (!items.length) {
      if (selectedId) {
        setSelectedId(null);
      }
      return;
    }

    const selectedStillVisible = items.some((item) => item.id === selectedId);
    if (!selectedStillVisible) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [listQuery.data?.items, selectedId]);

  const mutations = useNotebookMutations({ token });
  const listError = listQuery.isError
    ? toUserErrorMessage(listQuery.error, 'Failed to load opportunities.', {
        byStatus: {
          401: 'Your session expired. Sign in again to keep reviewing opportunities.',
          403: 'You do not have access to opportunities yet.',
          429: 'Opportunity data is being requested too aggressively right now. Wait a moment and retry.',
          500: 'Opportunity data is temporarily unavailable. Try again shortly.',
        },
      })
    : null;

  return {
    listQuery,
    listError,
    summaryQuery,
    selectedOffer,
    selectedId,
    mode,
    hasScore,
    search,
    tag,
    page,
    perPage,
    offset,
    canPrev: page > DEFAULT_PAGE,
    canNext: offset + perPage < (listQuery.data?.total ?? 0),
    setSelectedId,
    setMode,
    setHasScore,
    setSearch,
    setTag,
    setPage,
    setPerPage: (value: number) => {
      const nextValue = PER_PAGE_OPTIONS.includes(value as (typeof PER_PAGE_OPTIONS)[number])
        ? value
        : DEFAULT_PER_PAGE;
      setPerPage(nextValue);
      setPage(DEFAULT_PAGE);
    },
    resetFilters: () => {
      setMode('approx');
      setHasScore('all');
      setSearch('');
      setTag('');
      setPage(DEFAULT_PAGE);
      setPerPage(DEFAULT_PER_PAGE);
      setSelectedId(null);
    },
    saveOpportunity: (id: string) => mutations.statusMutation.mutate({ id, status: 'SAVED' }),
    markSeen: (id: string) => mutations.statusMutation.mutate({ id, status: 'SEEN' }),
    dismiss: (id: string) => mutations.statusMutation.mutate({ id, status: 'DISMISSED' }),
    isBusy: mutations.statusMutation.isPending,
  };
};

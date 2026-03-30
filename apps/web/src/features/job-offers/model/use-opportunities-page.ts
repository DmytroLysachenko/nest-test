'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getDiscoverySummary, listDiscoveryJobOffers } from '@/features/job-offers/api/job-offers-api';
import { useNotebookMutations } from '@/features/job-offers/model/hooks/use-notebook-mutations';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

type UseOpportunitiesPageArgs = {
  token: string;
  initialQuickAction?: 'unscored' | 'strictTop' | 'staleUntriaged' | null;
  initialOfferId?: string | null;
};

export const useOpportunitiesPage = ({
  token,
  initialQuickAction = null,
  initialOfferId = null,
}: UseOpportunitiesPageArgs) => {
  const [mode, setMode] = useState<'strict' | 'approx' | 'explore'>(
    initialQuickAction === 'strictTop' || initialQuickAction === 'staleUntriaged' ? 'strict' : 'strict',
  );
  const [hasScore, setHasScore] = useState<'all' | 'yes' | 'no'>(initialQuickAction === 'unscored' ? 'no' : 'all');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialOfferId);

  const listParams = useMemo(
    () => ({
      limit: 20,
      offset,
      mode,
      search: search || undefined,
      tag: tag || undefined,
      hasScore: hasScore === 'all' ? undefined : hasScore === 'yes',
    }),
    [hasScore, mode, offset, search, tag],
  );

  const listQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.discovery(token, listParams),
      queryFn: (authToken) => listDiscoveryJobOffers(authToken, listParams),
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.discoverySummary(token),
      queryFn: getDiscoverySummary,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const selectedOffer = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [listQuery.data?.items, selectedId],
  );

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
    offset,
    canPrev: offset > 0,
    canNext: (listQuery.data?.items.length ?? 0) === 20,
    setSelectedId,
    setMode,
    setHasScore,
    setSearch,
    setTag,
    setOffset,
    resetFilters: () => {
      setMode('strict');
      setHasScore('all');
      setSearch('');
      setTag('');
      setOffset(0);
    },
    saveOpportunity: (id: string) => mutations.statusMutation.mutate({ id, status: 'SAVED' }),
    markSeen: (id: string) => mutations.statusMutation.mutate({ id, status: 'SEEN' }),
    dismiss: (id: string) => mutations.statusMutation.mutate({ id, status: 'DISMISSED' }),
    isBusy: mutations.statusMutation.isPending,
  };
};

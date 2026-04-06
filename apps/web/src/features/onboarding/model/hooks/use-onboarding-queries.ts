'use client';

import { useQuery } from '@tanstack/react-query';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { getOnboardingDraft } from '@/features/onboarding/api/onboarding-drafts-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { isRateLimitedError } from '@/shared/lib/http/rate-limit';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { CareerProfileDto, DocumentDto } from '@/shared/types/api';

export const useOnboardingQueries = (
  token: string | null,
  shared: {
    latestCareerProfile?: CareerProfileDto | null;
    documents?: DocumentDto[];
  } = {},
) => {
  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      enabled: Boolean(token) && shared.latestCareerProfile === undefined,
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
      refetchInterval: (query) => {
        if (isRateLimitedError(query.state.error)) {
          return false;
        }
        const profile = (shared.latestCareerProfile ?? query.state.data) as { status?: string } | null | undefined;
        return profile?.status === 'PENDING' ? 2500 : false;
      },
    }),
  );

  const onboardingDraftQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.onboarding.draft(token),
      queryFn: getOnboardingDraft,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      enabled: Boolean(token) && shared.documents === undefined,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
      refetchInterval: (query) => {
        if (isRateLimitedError(query.state.error)) {
          return false;
        }
        const docs = (shared.documents ??
          (query.state.data as Array<{ extractionStatus?: string }> | undefined) ??
          []) as Array<{ extractionStatus?: string }>;
        return docs.some((item) => item.extractionStatus === 'PENDING') ? 2500 : false;
      },
    }),
  );

  return {
    latestCareerProfileQuery: {
      ...latestCareerProfileQuery,
      data: shared.latestCareerProfile ?? latestCareerProfileQuery.data,
    },
    onboardingDraftQuery,
    documentsQuery: {
      ...documentsQuery,
      data: shared.documents ?? documentsQuery.data ?? [],
    },
  };
};

'use client';

import { useQuery } from '@tanstack/react-query';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { getOnboardingDraft } from '@/features/onboarding/api/onboarding-drafts-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useOnboardingQueries = (token: string | null) => {
  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
    }),
  );

  const onboardingDraftQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.onboarding.draft(token),
      queryFn: getOnboardingDraft,
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
    }),
  );

  return {
    latestCareerProfileQuery,
    onboardingDraftQuery,
    documentsQuery,
  };
};


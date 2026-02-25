'use client';

import { useQuery } from '@tanstack/react-query';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useWorkflowQueries = (token: string | null) => {
  const hasToken = Boolean(token);

  const profileInputQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.profileInputs.latest(token),
      queryFn: getLatestProfileInput,
      enabled: hasToken,
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      enabled: hasToken,
    }),
  );

  const careerProfileQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      enabled: hasToken,
    }),
  );

  const runsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.runs(token),
      queryFn: listJobSourceRuns,
      enabled: hasToken,
    }),
  );

  const offersQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, { limit: 1, offset: 0 }),
      queryFn: (authToken) => listJobOffers(authToken, { limit: 1, offset: 0 }),
      enabled: hasToken,
    }),
  );

  return {
    profileInputQuery,
    documentsQuery,
    careerProfileQuery,
    runsQuery,
    offersQuery,
  };
};


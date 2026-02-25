'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getCareerProfileQuality,
  getLatestCareerProfile,
  listCareerProfileDocuments,
  listCareerProfileVersions,
} from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

type UseProfileManagementQueriesArgs = {
  token: string | null;
};

export const useProfileManagementQueries = ({ token }: UseProfileManagementQueriesArgs) => {
  const hasToken = Boolean(token);

  const latestProfileInputQuery = useQuery(
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

  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      enabled: hasToken,
    }),
  );

  const careerProfileQualityQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.quality(token),
      queryFn: getCareerProfileQuality,
      enabled: hasToken,
    }),
  );

  const careerProfileVersionsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.versions(token, 25, 0),
      queryFn: (authToken) => listCareerProfileVersions(authToken, { limit: 25, offset: 0 }),
      enabled: hasToken,
    }),
  );

  const selectedProfileDocumentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['career-profiles', 'documents', token, latestCareerProfileQuery.data?.id],
      queryFn: (authToken) => listCareerProfileDocuments(authToken, latestCareerProfileQuery.data!.id),
      enabled: hasToken && Boolean(latestCareerProfileQuery.data?.id),
    }),
  );

  return {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileQualityQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
  };
};


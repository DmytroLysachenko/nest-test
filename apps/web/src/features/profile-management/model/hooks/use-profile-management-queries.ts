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
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { CareerProfileDto, DocumentDto, ProfileInputDto } from '@/shared/types/api';

type UseProfileManagementQueriesArgs = {
  token: string | null;
  sharedLatestProfileInput?: ProfileInputDto | null;
  sharedDocuments?: DocumentDto[];
  sharedLatestCareerProfile?: CareerProfileDto | null;
};

export const useProfileManagementQueries = ({
  token,
  sharedLatestProfileInput,
  sharedDocuments,
  sharedLatestCareerProfile,
}: UseProfileManagementQueriesArgs) => {
  const hasToken = Boolean(token);

  const latestProfileInputQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.profileInputs.latest(token),
      queryFn: getLatestProfileInput,
      enabled: hasToken && sharedLatestProfileInput === undefined,
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      enabled: hasToken && sharedDocuments === undefined,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
      refetchInterval: (query) => {
        const docs = (sharedDocuments ??
          (query.state.data as Array<{ extractionStatus?: string }> | undefined) ??
          []) as Array<{
          extractionStatus?: string;
        }>;
        return docs.some((item) => item.extractionStatus === 'PENDING') ? 2500 : false;
      },
    }),
  );

  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      enabled: hasToken && sharedLatestCareerProfile === undefined,
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    }),
  );

  const latestProfileInputData = sharedLatestProfileInput ?? latestProfileInputQuery.data;
  const documentsData = sharedDocuments ?? documentsQuery.data ?? [];
  const latestCareerProfileData = sharedLatestCareerProfile ?? latestCareerProfileQuery.data;
  const latestCareerProfileId = latestCareerProfileData?.id;
  const latestCareerProfileStatus = latestCareerProfileData?.status;

  const careerProfileQualityQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.quality(token),
      queryFn: getCareerProfileQuality,
      enabled: hasToken && latestCareerProfileStatus === 'READY',
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const careerProfileVersionsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.careerProfiles.versions(token, 25, 0),
      queryFn: (authToken) => listCareerProfileVersions(authToken, { limit: 25, offset: 0 }),
      enabled: hasToken,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const selectedProfileDocumentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['career-profiles', 'documents', token, latestCareerProfileId],
      queryFn: (authToken) => listCareerProfileDocuments(authToken, latestCareerProfileId!),
      enabled: hasToken && Boolean(latestCareerProfileId),
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  return {
    latestProfileInputQuery: {
      ...latestProfileInputQuery,
      data: latestProfileInputData,
    },
    documentsQuery: {
      ...documentsQuery,
      data: documentsData,
    },
    latestCareerProfileQuery: {
      ...latestCareerProfileQuery,
      data: latestCareerProfileData,
    },
    careerProfileQualityQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
  };
};

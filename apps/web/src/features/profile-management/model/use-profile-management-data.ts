'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  generateCareerProfile,
  getLatestCareerProfile,
  listCareerProfileDocuments,
  listCareerProfileVersions,
  restoreCareerProfileVersion,
} from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { createProfileInput, getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { queryKeys } from '@/shared/lib/query/query-keys';

type UseProfileManagementDataArgs = {
  token: string | null;
};

export const useProfileManagementData = ({ token }: UseProfileManagementDataArgs) => {
  const queryClient = useQueryClient();
  const hasToken = Boolean(token);

  const latestProfileInputQuery = useQuery({
    queryKey: queryKeys.profileInputs.latest(token),
    queryFn: () => getLatestProfileInput(token as string),
    enabled: hasToken,
  });

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents.list(token),
    queryFn: () => listDocuments(token as string),
    enabled: hasToken,
  });

  const latestCareerProfileQuery = useQuery({
    queryKey: queryKeys.careerProfiles.latest(token),
    queryFn: () => getLatestCareerProfile(token as string),
    enabled: hasToken,
  });

  const careerProfileVersionsQuery = useQuery({
    queryKey: queryKeys.careerProfiles.versions(token, 25, 0),
    queryFn: () => listCareerProfileVersions(token as string, { limit: 25, offset: 0 }),
    enabled: hasToken,
  });

  const selectedProfileDocumentsQuery = useQuery({
    queryKey: ['career-profiles', 'documents', token, latestCareerProfileQuery.data?.id],
    queryFn: () => listCareerProfileDocuments(token as string, latestCareerProfileQuery.data!.id),
    enabled: hasToken && Boolean(latestCareerProfileQuery.data?.id),
  });

  const saveProfileInputMutation = useMutation({
    mutationFn: (payload: { targetRoles: string; notes?: string }) => createProfileInput(token as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profileInputs.latest(token) });
    },
  });

  const generateProfileMutation = useMutation({
    mutationFn: (payload: { instructions?: string }) => generateCareerProfile(token as string, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.latest(token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.versions(token, 25, 0) }),
      ]);
    },
  });

  const restoreProfileMutation = useMutation({
    mutationFn: (careerProfileId: string) => restoreCareerProfileVersion(token as string, careerProfileId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.latest(token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.versions(token, 25, 0) }),
      ]);
    },
  });

  return {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
    saveProfileInputMutation,
    generateProfileMutation,
    restoreProfileMutation,
  };
};

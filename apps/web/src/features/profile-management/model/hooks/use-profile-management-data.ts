'use client';

import { useProfileManagementMutations } from '@/features/profile-management/model/hooks/use-profile-management-mutations';
import { useProfileManagementQueries } from '@/features/profile-management/model/hooks/use-profile-management-queries';

import type { CareerProfileDto, DocumentDto, ProfileInputDto } from '@/shared/types/api';

type UseProfileManagementDataArgs = {
  token: string | null;
  sharedLatestProfileInput?: ProfileInputDto | null;
  sharedDocuments?: DocumentDto[];
  sharedLatestCareerProfile?: CareerProfileDto | null;
};

export const useProfileManagementData = ({
  token,
  sharedLatestProfileInput,
  sharedDocuments,
  sharedLatestCareerProfile,
}: UseProfileManagementDataArgs) => {
  const {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileQualityQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
  } = useProfileManagementQueries({ token, sharedLatestProfileInput, sharedDocuments, sharedLatestCareerProfile });

  const { saveProfileInputMutation, generateProfileMutation, restoreProfileMutation, errors } =
    useProfileManagementMutations({ token });

  return {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileQualityQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
    saveProfileInputMutation,
    generateProfileMutation,
    restoreProfileMutation,
    errors,
  };
};

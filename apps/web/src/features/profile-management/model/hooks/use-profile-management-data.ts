'use client';

import { useProfileManagementMutations } from '@/features/profile-management/model/hooks/use-profile-management-mutations';
import { useProfileManagementQueries } from '@/features/profile-management/model/hooks/use-profile-management-queries';

type UseProfileManagementDataArgs = {
  token: string | null;
};

export const useProfileManagementData = ({ token }: UseProfileManagementDataArgs) => {
  const {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileQualityQuery,
    careerProfileVersionsQuery,
    selectedProfileDocumentsQuery,
  } = useProfileManagementQueries({ token });

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

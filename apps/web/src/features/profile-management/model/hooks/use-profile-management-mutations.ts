'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateCareerProfile, restoreCareerProfileVersion } from '@/features/career-profiles/api/career-profiles-api';
import { createProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastError, toastSuccess } from '@/shared/lib/ui/toast';

type UseProfileManagementMutationsArgs = {
  token: string | null;
};

export const useProfileManagementMutations = ({ token }: UseProfileManagementMutationsArgs) => {
  const queryClient = useQueryClient();

  const saveProfileInputMutation = useMutation({
    mutationFn: (payload: { targetRoles: string; notes?: string }) => createProfileInput(token as string, payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [queryKeys.profileInputs.latest(token)]);
      toastSuccess('Profile input saved');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to save profile input'));
    },
  });

  const generateProfileMutation = useMutation({
    mutationFn: (payload: { instructions?: string }) => generateCareerProfile(token as string, payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [
        queryKeys.careerProfiles.latest(token),
        queryKeys.careerProfiles.quality(token),
        queryKeys.careerProfiles.versions(token, 25, 0),
      ]);
      toastSuccess('Career profile generated');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to generate profile'));
    },
  });

  const restoreProfileMutation = useMutation({
    mutationFn: (careerProfileId: string) => restoreCareerProfileVersion(token as string, careerProfileId),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [
        queryKeys.careerProfiles.latest(token),
        queryKeys.careerProfiles.quality(token),
        queryKeys.careerProfiles.versions(token, 25, 0),
      ]);
      toastSuccess('Profile version restored');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to restore profile version'));
    },
  });

  const errors = {
    saveProfileInput: saveProfileInputMutation.error
      ? toUserErrorMessage(saveProfileInputMutation.error, 'Failed to save profile input')
      : null,
    generateProfile: generateProfileMutation.error
      ? toUserErrorMessage(generateProfileMutation.error, 'Failed to generate profile')
      : null,
    restoreProfile: restoreProfileMutation.error
      ? toUserErrorMessage(restoreProfileMutation.error, 'Failed to restore profile version')
      : null,
  };

  return {
    saveProfileInputMutation,
    generateProfileMutation,
    restoreProfileMutation,
    errors,
  };
};

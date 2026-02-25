'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';

import { generateCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { CareerProfileGenerationFormValues } from '@/features/career-profiles/model/validation/career-profile-generation-form-schema';

export const useCareerProfileMutations = (
  token: string,
  form: UseFormReturn<CareerProfileGenerationFormValues>,
) => {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: (values: CareerProfileGenerationFormValues) =>
      generateCareerProfile(token, {
        instructions: values.instructions?.trim() ? values.instructions.trim() : undefined,
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await invalidateQueryKeys(queryClient, [queryKeys.careerProfiles.latest(token)]);
      toastSuccess('Career profile generated');
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Career profile generation failed',
      });
    },
  });

  return {
    generateMutation,
  };
};


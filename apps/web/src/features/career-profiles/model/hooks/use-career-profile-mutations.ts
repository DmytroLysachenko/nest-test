'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { UseFormReturn } from 'react-hook-form';
import type { CareerProfileGenerationFormValues } from '@/features/career-profiles/model/validation/career-profile-generation-form-schema';

export const useCareerProfileMutations = (token: string, form: UseFormReturn<CareerProfileGenerationFormValues>) => {
  const { syncProfile } = useDataSync(token);

  const generateMutation = useMutation({
    mutationFn: (values: CareerProfileGenerationFormValues) =>
      generateCareerProfile(token, {
        instructions: values.instructions?.trim() ? values.instructions.trim() : undefined,
      }),
    onSuccess: (data) => {
      form.clearErrors('root');
      syncProfile(data);
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

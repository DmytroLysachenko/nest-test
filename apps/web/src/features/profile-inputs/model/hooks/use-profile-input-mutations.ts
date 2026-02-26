'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';

import { createProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { ProfileInputFormValues } from '@/features/profile-inputs/model/validation/profile-input-form-schema';

export const useProfileInputMutations = (token: string, form: UseFormReturn<ProfileInputFormValues>) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ProfileInputFormValues) =>
      createProfileInput(token, {
        targetRoles: values.targetRoles,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      }),
    onSuccess: async () => {
      form.reset();
      form.clearErrors('root');
      await invalidateQueryKeys(queryClient, [queryKeys.profileInputs.latest(token)]);
      toastSuccess('Profile input saved');
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Failed to save profile input',
      });
    },
  });

  return {
    createMutation,
  };
};

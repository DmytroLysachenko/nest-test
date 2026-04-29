'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toOptionalTrimmedString } from '@/shared/lib/utils/input-normalizers';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { UseFormReturn } from 'react-hook-form';
import type { ProfileInputFormValues } from '@/features/profile-inputs/model/validation/profile-input-form-schema';

export const useProfileInputMutations = (token: string, form: UseFormReturn<ProfileInputFormValues>) => {
  const { syncProfileInputs } = useDataSync(token);

  const createMutation = useMutation({
    mutationFn: (values: ProfileInputFormValues) =>
      createProfileInput(token, {
        targetRoles: values.targetRoles,
        notes: toOptionalTrimmedString(values.notes),
      }),
    onSuccess: (data) => {
      form.reset();
      form.clearErrors('root');
      syncProfileInputs(data);
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

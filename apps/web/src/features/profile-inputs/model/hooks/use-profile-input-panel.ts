'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useForm } from 'react-hook-form';

import { useProfileInputMutations } from '@/features/profile-inputs/model/hooks/use-profile-input-mutations';
import { useProfileInputQueries } from '@/features/profile-inputs/model/hooks/use-profile-input-queries';
import {
  profileInputFormSchema,
  type ProfileInputFormValues,
} from '@/features/profile-inputs/model/validation/profile-input-form-schema';

export const useProfileInputPanel = (token: string) => {
  const form = useForm<ProfileInputFormValues>({
    resolver: zodFormResolver<ProfileInputFormValues>(profileInputFormSchema),
    defaultValues: {
      targetRoles: '',
      notes: '',
    },
  });

  const { latestQuery } = useProfileInputQueries(token);
  const { createMutation } = useProfileInputMutations(token, form);

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    createMutation.mutate(values);
  });

  return {
    form,
    submit,
    latestQuery,
    isSubmitting: createMutation.isPending,
  };
};

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { createProfileInput, getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import {
  profileInputFormSchema,
  type ProfileInputFormValues,
} from '@/features/profile-inputs/model/validation/profile-input-form-schema';
import { ApiError } from '@/shared/lib/http/api-error';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useProfileInputPanel = (token: string) => {
  const queryClient = useQueryClient();

  const form = useForm<ProfileInputFormValues>({
    resolver: zodResolver(profileInputFormSchema),
    defaultValues: {
      targetRoles: '',
      notes: '',
    },
  });

  const latestQuery = useQuery({
    queryKey: queryKeys.profileInputs.latest(token),
    queryFn: () => getLatestProfileInput(token),
  });

  const createMutation = useMutation({
    mutationFn: (values: ProfileInputFormValues) =>
      createProfileInput(token, {
        targetRoles: values.targetRoles,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      }),
    onSuccess: async () => {
      form.reset();
      form.clearErrors('root');
      await queryClient.invalidateQueries({ queryKey: queryKeys.profileInputs.latest(token) });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to save profile input';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

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

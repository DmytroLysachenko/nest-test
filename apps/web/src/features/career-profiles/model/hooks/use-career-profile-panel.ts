'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { generateCareerProfile, getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import {
  careerProfileGenerationFormSchema,
  type CareerProfileGenerationFormValues,
} from '@/features/career-profiles/model/validation/career-profile-generation-form-schema';
import { ApiError } from '@/shared/lib/http/api-error';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useCareerProfilePanel = (token: string) => {
  const queryClient = useQueryClient();

  const form = useForm<CareerProfileGenerationFormValues>({
    resolver: zodResolver(careerProfileGenerationFormSchema),
    defaultValues: {
      instructions: '',
    },
  });

  const latestQuery = useQuery({
    queryKey: queryKeys.careerProfiles.latest(token),
    queryFn: () => getLatestCareerProfile(token),
  });

  const generateMutation = useMutation({
    mutationFn: (values: CareerProfileGenerationFormValues) =>
      generateCareerProfile(token, {
        instructions: values.instructions?.trim() ? values.instructions.trim() : undefined,
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.latest(token) });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Career profile generation failed';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    generateMutation.mutate(values);
  });

  return {
    form,
    submit,
    latestQuery,
    isSubmitting: generateMutation.isPending,
  };
};

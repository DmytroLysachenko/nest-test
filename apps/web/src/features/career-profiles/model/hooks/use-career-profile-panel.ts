'use client';

import { useForm } from 'react-hook-form';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useCareerProfileMutations } from '@/features/career-profiles/model/hooks/use-career-profile-mutations';
import { useCareerProfileQueries } from '@/features/career-profiles/model/hooks/use-career-profile-queries';
import {
  careerProfileGenerationFormSchema,
  type CareerProfileGenerationFormValues,
} from '@/features/career-profiles/model/validation/career-profile-generation-form-schema';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

export const useCareerProfilePanel = (token: string) => {
  const form = useForm<CareerProfileGenerationFormValues>({
    resolver: zodFormResolver<CareerProfileGenerationFormValues>(careerProfileGenerationFormSchema),
    defaultValues: {
      instructions: '',
    },
  });

  const { latestQuery } = useCareerProfileQueries(token);
  const { generateMutation } = useCareerProfileMutations(token, form);

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    generateMutation.mutate(values);
  });

  return {
    form,
    submit,
    latestQuery,
    latestErrorMessage: latestQuery.error
      ? toUserErrorMessage(latestQuery.error, 'Unable to load the latest generated profile right now.')
      : null,
    isSubmitting: generateMutation.isPending,
  };
};

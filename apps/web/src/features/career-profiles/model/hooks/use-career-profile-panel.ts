'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useForm } from 'react-hook-form';

import { useCareerProfileMutations } from '@/features/career-profiles/model/hooks/use-career-profile-mutations';
import { useCareerProfileQueries } from '@/features/career-profiles/model/hooks/use-career-profile-queries';
import {
  careerProfileGenerationFormSchema,
  type CareerProfileGenerationFormValues,
} from '@/features/career-profiles/model/validation/career-profile-generation-form-schema';

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
    isSubmitting: generateMutation.isPending,
  };
};

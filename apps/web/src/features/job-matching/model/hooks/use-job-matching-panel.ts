'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useForm } from 'react-hook-form';

import {
  jobMatchingFormSchema,
  type JobMatchingFormValues,
} from '@/features/job-matching/model/validation/job-matching-form-schema';
import { useJobMatchingMutations } from '@/features/job-matching/model/hooks/use-job-matching-mutations';
import { useJobMatchingQueries } from '@/features/job-matching/model/hooks/use-job-matching-queries';

export const useJobMatchingPanel = (token: string) => {
  const form = useForm<JobMatchingFormValues>({
    resolver: zodFormResolver<JobMatchingFormValues>(jobMatchingFormSchema),
    defaultValues: {
      jobDescription: '',
      minScore: '60',
    },
  });

  const { historyQuery } = useJobMatchingQueries(token);
  const { scoreMutation } = useJobMatchingMutations(token, form);

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    scoreMutation.mutate(values);
  });

  return {
    form,
    submit,
    historyQuery,
    scoreResult: scoreMutation.data,
    isSubmitting: scoreMutation.isPending,
  };
};

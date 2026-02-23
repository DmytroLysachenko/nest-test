'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { getJobMatchHistory, scoreJob } from '@/features/job-matching/api/job-matching-api';
import {
  jobMatchingFormSchema,
  type JobMatchingFormValues,
} from '@/features/job-matching/model/validation/job-matching-form-schema';
import { ApiError } from '@/shared/lib/http/api-error';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useJobMatchingPanel = (token: string) => {
  const queryClient = useQueryClient();

  const form = useForm<JobMatchingFormValues>({
    resolver: zodResolver(jobMatchingFormSchema),
    defaultValues: {
      jobDescription: '',
      minScore: '60',
    },
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.jobMatching.list(token),
    queryFn: () => getJobMatchHistory(token),
  });

  const scoreMutation = useMutation({
    mutationFn: (values: JobMatchingFormValues) =>
      scoreJob(token, {
        jobDescription: values.jobDescription,
        minScore: Number(values.minScore),
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobMatching.list(token) });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Scoring failed';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

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

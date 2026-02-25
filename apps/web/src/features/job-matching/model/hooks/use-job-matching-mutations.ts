'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { scoreJob } from '@/features/job-matching/api/job-matching-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { JobMatchingFormValues } from '@/features/job-matching/model/validation/job-matching-form-schema';
import type { UseFormReturn } from 'react-hook-form';

export const useJobMatchingMutations = (
  token: string,
  form: UseFormReturn<JobMatchingFormValues>,
) => {
  const queryClient = useQueryClient();

  const scoreMutation = useMutation({
    mutationFn: (values: JobMatchingFormValues) =>
      scoreJob(token, {
        jobDescription: values.jobDescription,
        minScore: Number(values.minScore),
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await invalidateQueryKeys(queryClient, [queryKeys.jobMatching.list(token)]);
      toastSuccess('Matching score calculated');
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Scoring failed',
      });
    },
  });

  return {
    scoreMutation,
  };
};


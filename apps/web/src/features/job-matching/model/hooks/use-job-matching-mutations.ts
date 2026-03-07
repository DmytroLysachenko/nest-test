'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { scoreJob } from '@/features/job-matching/api/job-matching-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { JobMatchingFormValues } from '@/features/job-matching/model/validation/job-matching-form-schema';
import type { UseFormReturn } from 'react-hook-form';

export const useJobMatchingMutations = (token: string, form: UseFormReturn<JobMatchingFormValues>) => {
  const { syncJobMatching } = useDataSync(token);

  const scoreMutation = useMutation({
    mutationFn: (values: JobMatchingFormValues) =>
      scoreJob(token, {
        jobDescription: values.jobDescription,
        minScore: Number(values.minScore),
      }),
    onSuccess: () => {
      form.clearErrors('root');
      syncJobMatching();
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

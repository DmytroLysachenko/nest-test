'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';

import { enqueueScrape } from '@/features/job-sources/api/job-sources-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { EnqueueScrapeFormValues } from '@/features/job-sources/model/validation/enqueue-scrape-schema';

export const useJobSourcesMutations = (token: string, form: UseFormReturn<EnqueueScrapeFormValues>) => {
  const queryClient = useQueryClient();

  const enqueueMutation = useMutation({
    mutationFn: (values: EnqueueScrapeFormValues) =>
      enqueueScrape(token, {
        listingUrl: values.mode === 'custom' ? values.listingUrl : undefined,
        limit: Number(values.limit),
        source: values.mode === 'custom' ? 'pracuj-pl' : undefined,
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await invalidateQueryKeys(queryClient, [queryKeys.jobSources.runs(token)]);
      toastSuccess('Scrape request queued');
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Failed to enqueue scrape',
      });
    },
  });

  return {
    enqueueMutation,
  };
};

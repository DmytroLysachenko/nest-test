'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { enqueueScrape, listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import {
  enqueueScrapeSchema,
  type EnqueueScrapeFormValues,
} from '@/features/job-sources/model/validation/enqueue-scrape-schema';
import { ApiError } from '@/shared/lib/http/api-error';
import { queryKeys } from '@/shared/lib/query/query-keys';

const DEFAULT_LISTING_URL = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend';

export const useJobSourcesPanel = (token: string) => {
  const queryClient = useQueryClient();

  const form = useForm<EnqueueScrapeFormValues>({
    resolver: zodResolver(enqueueScrapeSchema),
    defaultValues: {
      mode: 'profile',
      listingUrl: DEFAULT_LISTING_URL,
      limit: '20',
    },
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.jobSources.runs(token),
    queryFn: () => listJobSourceRuns(token),
    refetchInterval: 15000,
  });

  const enqueueMutation = useMutation({
    mutationFn: (values: EnqueueScrapeFormValues) =>
      enqueueScrape(token, {
        listingUrl: values.mode === 'custom' ? values.listingUrl : undefined,
        limit: Number(values.limit),
        source: values.mode === 'custom' ? 'pracuj-pl' : undefined,
      }),
    onSuccess: async () => {
      form.clearErrors('root');
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobSources.runs(token) });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Failed to enqueue scrape';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    enqueueMutation.mutate(values);
  });

  const mode = form.watch('mode');

  return {
    form,
    submit,
    mode,
    runsQuery,
    enqueueResult: enqueueMutation.data,
    isSubmitting: enqueueMutation.isPending,
  };
};

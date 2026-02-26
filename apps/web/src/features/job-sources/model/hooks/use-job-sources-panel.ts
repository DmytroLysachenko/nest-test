'use client';

import { useState } from 'react';
import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useForm } from 'react-hook-form';

import { useJobSourcesMutations } from '@/features/job-sources/model/hooks/use-job-sources-mutations';
import { useJobSourcesQueries } from '@/features/job-sources/model/hooks/use-job-sources-queries';
import {
  enqueueScrapeSchema,
  type EnqueueScrapeFormValues,
} from '@/features/job-sources/model/validation/enqueue-scrape-schema';

const DEFAULT_LISTING_URL = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend';

export const useJobSourcesPanel = (token: string) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const form = useForm<EnqueueScrapeFormValues>({
    resolver: zodFormResolver<EnqueueScrapeFormValues>(enqueueScrapeSchema),
    defaultValues: {
      mode: 'profile',
      listingUrl: DEFAULT_LISTING_URL,
      limit: '20',
    },
  });

  const { runsQuery, diagnosticsQuery } = useJobSourcesQueries(token, selectedRunId);
  const { enqueueMutation } = useJobSourcesMutations(token, form);

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
    diagnosticsQuery,
    selectedRunId,
    setSelectedRunId,
    enqueueResult: enqueueMutation.data,
    isSubmitting: enqueueMutation.isPending,
  };
};

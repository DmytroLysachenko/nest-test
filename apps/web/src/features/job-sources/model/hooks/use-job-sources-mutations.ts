'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  enqueueScrape,
  rematchNow,
  triggerScheduleNow,
  updateScrapeSchedule,
} from '@/features/job-sources/api/job-sources-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastInfo, toastSuccess } from '@/shared/lib/ui/toast';

import type { UseFormReturn } from 'react-hook-form';
import type { EnqueueScrapeFormValues } from '@/features/job-sources/model/validation/enqueue-scrape-schema';

export const useJobSourcesMutations = (token: string, form: UseFormReturn<EnqueueScrapeFormValues>) => {
  const queryClient = useQueryClient();
  const { syncJobSources } = useDataSync(token);

  const enqueueMutation = useMutation({
    mutationFn: (values: EnqueueScrapeFormValues) =>
      enqueueScrape(token, {
        listingUrl: values.mode === 'custom' ? values.listingUrl : undefined,
        limit: Number(values.limit),
        source: values.mode === 'custom' ? 'pracuj-pl' : undefined,
      }),
    onSuccess: () => {
      form.clearErrors('root');
      syncJobSources();
      toastSuccess('Search update started');
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Unable to start the search update',
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (payload: {
      enabled: boolean;
      cron?: string;
      timezone?: string;
      source?: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
      limit?: number;
    }) => updateScrapeSchedule(token, payload),
    onSuccess: () => {
      syncJobSources();
      toastSuccess('Automatic updates saved');
    },
  });

  const triggerScheduleNowMutation = useMutation({
    mutationFn: () => triggerScheduleNow(token),
    onSuccess: () => {
      syncJobSources();
      queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      toastSuccess('Automatic update started');
    },
  });

  const rematchNowMutation = useMutation({
    mutationFn: () => rematchNow(token),
    onSuccess: (result) => {
      syncJobSources();
      queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      if (result.status === 'empty') {
        toastInfo('No recent catalog offers matched the current profile');
        return;
      }
      if (result.inserted > 0) {
        toastSuccess(`Recovered ${result.inserted} opportunities from the shared catalog`);
        return;
      }
      toastInfo('Catalog rematch finished, but the current opportunities were already linked');
    },
  });

  return {
    enqueueMutation,
    updateScheduleMutation,
    triggerScheduleNowMutation,
    rematchNowMutation,
  };
};

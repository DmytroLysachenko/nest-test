'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
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

  const scheduleForm = useForm<{
    enabled: boolean;
    cron: string;
    timezone: string;
    source: 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';
    limit: string;
  }>({
    defaultValues: {
      enabled: false,
      cron: '0 9 * * *',
      timezone: 'Europe/Warsaw',
      source: 'pracuj-pl-it',
      limit: '20',
    },
  });

  const mode = form.watch('mode');
  const listingUrl = form.watch('listingUrl');
  const limit = form.watch('limit');
  const preflightParams = useMemo(
    () => ({
      source: mode === 'custom' ? ('pracuj-pl' as const) : undefined,
      listingUrl: mode === 'custom' ? listingUrl : undefined,
      limit: Number(limit),
    }),
    [limit, listingUrl, mode],
  );

  const { runsQuery, diagnosticsQuery, sourceHealthQuery, scheduleQuery, preflightQuery } = useJobSourcesQueries(
    token,
    selectedRunId,
    preflightParams,
  );
  const { enqueueMutation, updateScheduleMutation, triggerScheduleNowMutation } = useJobSourcesMutations(token, form);

  useEffect(() => {
    if (!scheduleQuery.data) {
      return;
    }

    scheduleForm.reset({
      enabled: scheduleQuery.data.enabled,
      cron: scheduleQuery.data.cron,
      timezone: scheduleQuery.data.timezone,
      source: scheduleQuery.data.source as 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general',
      limit: String(scheduleQuery.data.limit),
    });
  }, [scheduleForm, scheduleQuery.data]);

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    enqueueMutation.mutate(values);
  });

  const submitSchedule = scheduleForm.handleSubmit((values) => {
    updateScheduleMutation.mutate({
      enabled: values.enabled,
      cron: values.cron,
      timezone: values.timezone,
      source: values.source,
      limit: Number(values.limit),
    });
  });

  const applySchedulePreset = (preset: 'weekdays-morning' | 'daily-evening' | 'paused') => {
    if (preset === 'paused') {
      scheduleForm.setValue('enabled', false);
      return;
    }

    scheduleForm.setValue('enabled', true);
    scheduleForm.setValue('cron', preset === 'weekdays-morning' ? '0 8 * * 1-5' : '0 18 * * *');
    scheduleForm.setValue('timezone', 'Europe/Warsaw');
  };

  return {
    form,
    scheduleForm,
    submit,
    submitSchedule,
    mode,
    runsQuery,
    diagnosticsQuery,
    sourceHealthQuery,
    scheduleQuery,
    preflightQuery,
    selectedRunId,
    setSelectedRunId,
    enqueueResult: enqueueMutation.data,
    scheduleResult: scheduleQuery.data,
    isSubmitting: enqueueMutation.isPending,
    isSavingSchedule: updateScheduleMutation.isPending,
    isTriggeringSchedule: triggerScheduleNowMutation.isPending,
    triggerScheduleNow: triggerScheduleNowMutation.mutate,
    applySchedulePreset,
  };
};

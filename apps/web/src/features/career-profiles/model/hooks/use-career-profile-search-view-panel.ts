'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { getCareerProfilesSearchView } from '@/features/career-profiles/api/career-profiles-api';
import {
  careerProfileSearchViewFormSchema,
  type CareerProfileSearchViewFormValues,
} from '@/features/career-profiles/model/validation/career-profile-search-view-form-schema';
import { ApiError } from '@/shared/lib/http/api-error';

import type { CareerProfileSearchViewItemDto } from '@/shared/types/api';

export const useCareerProfileSearchViewPanel = (token: string) => {
  const form = useForm<CareerProfileSearchViewFormValues>({
    resolver: zodFormResolver<CareerProfileSearchViewFormValues>(careerProfileSearchViewFormSchema),
    defaultValues: {
      status: 'READY',
      isActive: 'true',
      seniority: '',
      role: '',
      keyword: '',
      technology: '',
      limit: '10',
      offset: '0',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CareerProfileSearchViewFormValues) =>
      getCareerProfilesSearchView(token, {
        status: values.status,
        isActive: values.isActive === 'true',
        seniority: values.seniority || undefined,
        role: values.role || undefined,
        keyword: values.keyword || undefined,
        technology: values.technology || undefined,
        limit: Number(values.limit),
        offset: Number(values.offset),
      }),
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        form.setError('root', { type: 'server', message: error.message });
        return;
      }
      if (error instanceof Error) {
        form.setError('root', { type: 'server', message: error.message });
        return;
      }
      form.setError('root', { type: 'server', message: 'Failed to load search-view data.' });
    },
  });

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root');
    mutation.mutate(values);
  });

  return {
    form,
    submit,
    rows: mutation.data?.items ?? ([] as CareerProfileSearchViewItemDto[]),
    total: mutation.data?.total ?? 0,
    isSubmitting: mutation.isPending,
  };
};

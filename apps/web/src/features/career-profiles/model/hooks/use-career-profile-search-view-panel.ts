'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { getCareerProfilesSearchView } from '@/features/career-profiles/api/career-profiles-api';
import {
  careerProfileSearchViewFormSchema,
  type CareerProfileSearchViewFormValues,
} from '@/features/career-profiles/model/validation/career-profile-search-view-form-schema';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

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
      form.setError('root', {
        type: 'server',
        message: toUserErrorMessage(error, 'Unable to load the career profile search view.', {
          byStatus: {
            401: 'Your session expired before the search view could load. Sign in again and retry.',
            403: 'This validation view is currently unavailable for your account.',
          },
        }),
      });
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
    hasRequested: mutation.isSuccess || mutation.isError,
    isSubmitting: mutation.isPending,
  };
};

'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { runTesterRequest } from '@/features/tester/api/tester-api';
import { testerEndpointPresets, type TesterService } from '@/features/tester/model/endpoint-presets';
import {
  testerRequestFormSchema,
  type TesterRequestFormValues,
} from '@/features/tester/model/validation/tester-request-form-schema';
import { env } from '@/shared/config/env';
import { ApiError } from '@/shared/lib/http/api-error';
import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);
const defaultPreset = testerEndpointPresets[0];

export const useTesterPage = (token: string) => {
  if (!defaultPreset) {
    throw new Error('No tester endpoint presets configured.');
  }

  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedPreset = useMemo(
    () => testerEndpointPresets.find((preset) => preset.id === selectedPresetId) ?? defaultPreset,
    [selectedPresetId],
  );

  const form = useForm<TesterRequestFormValues>({
    resolver: zodFormResolver<TesterRequestFormValues>(testerRequestFormSchema),
    defaultValues: {
      service: selectedPreset.service,
      method: selectedPreset.method,
      path: selectedPreset.path,
      useApiToken: selectedPreset.requiresAuth ? 'yes' : 'no',
      workerToken: '',
      headersText: '',
      bodyText: selectedPreset.defaultBody ? formatJson(selectedPreset.defaultBody) : '',
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: TesterRequestFormValues) =>
      runTesterRequest({
        service: values.service as TesterService,
        method: values.method,
        path: values.path,
        token: values.useApiToken === 'yes' ? token : null,
        workerToken: values.workerToken?.trim() || null,
        extraHeadersText: values.headersText,
        bodyText: values.bodyText,
        apiBaseUrl: env.NEXT_PUBLIC_API_URL,
        workerBaseUrl: env.NEXT_PUBLIC_WORKER_URL,
      }),
    onError: (err: unknown) => {
      setError(
        toUserErrorMessage(err, 'The tester request did not complete.', {
          byCode: {
            INVALID_JSON: 'Request JSON is invalid. Fix the body or headers payload and send again.',
          },
          byStatus: {
            401: 'The endpoint rejected this request because the current token is missing or expired.',
            403: 'The endpoint refused this request for the current token or worker secret.',
            404: 'The target route was not found. Check the service and path before retrying.',
          },
        }),
      );
    },
    onSuccess: () => {
      setError(null);
    },
  });

  const applyPreset = () => {
    if (!selectedPreset) {
      return;
    }

    form.reset({
      service: selectedPreset.service,
      method: selectedPreset.method,
      path: selectedPreset.path,
      useApiToken: selectedPreset.requiresAuth ? 'yes' : 'no',
      workerToken: '',
      headersText: '',
      bodyText: selectedPreset.defaultBody ? formatJson(selectedPreset.defaultBody) : '',
    });
    setError(null);
  };

  const submit = form.handleSubmit((values) => {
    setError(null);
    mutation.mutate(values);
  });

  return {
    form,
    submit,
    mounted,
    error,
    setError,
    selectedPresetId,
    setSelectedPresetId,
    selectedPreset,
    applyPreset,
    mutation,
    targets: {
      apiBaseUrl: env.NEXT_PUBLIC_API_URL,
      workerBaseUrl: env.NEXT_PUBLIC_WORKER_URL,
    },
    formatJson,
  };
};

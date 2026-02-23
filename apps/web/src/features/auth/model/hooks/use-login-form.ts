'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { login } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/model/context/auth-context';
import { loginSchema } from '@/features/auth/model/validation/auth-schemas';
import { ApiError } from '@/shared/lib/http/api-error';

import type { LoginFormValues } from '@/features/auth/model/validation/auth-schemas';

export const useLoginForm = () => {
  const router = useRouter();
  const auth = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      auth.setSession(response.accessToken, response.refreshToken, response.user);
      router.push('/app');
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : 'Login failed';
      form.setError('root', {
        type: 'server',
        message,
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
    isSubmitting: mutation.isPending,
  };
};

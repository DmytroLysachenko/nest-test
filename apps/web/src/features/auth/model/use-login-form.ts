'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { login } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/model/auth-context';
import { ApiError } from '@/shared/lib/http/api-error';

export const useLoginForm = () => {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      auth.setSession(response.accessToken, response.refreshToken, response.user);
      router.push('/app');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError('Login failed');
    },
  });

  const submit = () => {
    setError(null);
    mutation.mutate({ email, password });
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting: mutation.isPending,
    submit,
  };
};

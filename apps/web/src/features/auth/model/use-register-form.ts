'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { register, sendRegisterCode } from '@/features/auth/api/auth-api';
import { ApiError } from '@/shared/lib/http/api-error';

export const useRegisterForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendCodeMutation = useMutation({
    mutationFn: sendRegisterCode,
    onSuccess: () => {
      setStatus('Verification code sent to your email.');
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Failed to send verification code';
      setStatus(null);
      setError(message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      router.push('/login');
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      setStatus(null);
      setError(message);
    },
  });

  const requestCode = () => {
    if (!email) {
      return;
    }
    sendCodeMutation.mutate(email);
  };

  const submit = () => {
    setError(null);
    setStatus(null);
    registerMutation.mutate({ email, password, confirmPassword, code });
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    code,
    setCode,
    status,
    error,
    canRequestCode: Boolean(email),
    isSendingCode: sendCodeMutation.isPending,
    isSubmitting: registerMutation.isPending,
    requestCode,
    submit,
  };
};

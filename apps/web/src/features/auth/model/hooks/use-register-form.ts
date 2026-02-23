'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { register, sendRegisterCode } from '@/features/auth/api/auth-api';
import { registerSchema } from '@/features/auth/model/validation/auth-schemas';
import { ApiError } from '@/shared/lib/http/api-error';

import type { RegisterFormValues } from '@/features/auth/model/validation/auth-schemas';

export const useRegisterForm = () => {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: sendRegisterCode,
    onSuccess: () => {
      setStatus('Verification code sent to your email.');
      form.clearErrors('root');
    },
    onError: (error: unknown) => {
      setStatus(null);
      const message = error instanceof ApiError ? error.message : 'Failed to send verification code';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      router.push('/login');
    },
    onError: (error: unknown) => {
      setStatus(null);
      const message = error instanceof ApiError ? error.message : 'Registration failed';
      form.setError('root', {
        type: 'server',
        message,
      });
    },
  });

  const requestCode = async () => {
    const valid = await form.trigger('email');
    if (!valid) {
      return;
    }

    setStatus(null);
    form.clearErrors('root');
    const email = form.getValues('email');
    sendCodeMutation.mutate(email);
  };

  const submit = form.handleSubmit((values) => {
    setStatus(null);
    form.clearErrors('root');
    registerMutation.mutate(values);
  });

  return {
    form,
    status,
    requestCode,
    submit,
    isSendingCode: sendCodeMutation.isPending,
    isSubmitting: registerMutation.isPending,
  };
};

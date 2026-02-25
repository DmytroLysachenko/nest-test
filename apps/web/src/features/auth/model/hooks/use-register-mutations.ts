'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { UseFormReturn } from 'react-hook-form';

import { register, sendRegisterCode } from '@/features/auth/api/auth-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';
import { toastSuccess } from '@/shared/lib/ui/toast';

import type { RegisterFormValues } from '@/features/auth/model/validation/auth-schemas';

type UseRegisterMutationsArgs = {
  form: UseFormReturn<RegisterFormValues>;
  setStatus: (status: string | null) => void;
};

export const useRegisterMutations = ({ form, setStatus }: UseRegisterMutationsArgs) => {
  const router = useRouter();

  const sendCodeMutation = useMutation({
    mutationFn: sendRegisterCode,
    onSuccess: () => {
      setStatus('Verification code sent to your email.');
      form.clearErrors('root');
      toastSuccess('Verification code sent');
    },
    onError: (error: unknown) => {
      setStatus(null);
      setRootServerError(form, error, {
        fallbackMessage: 'Failed to send verification code',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      toastSuccess('Registration successful. Please sign in.');
      router.push('/login');
    },
    onError: (error: unknown) => {
      setStatus(null);
      setRootServerError(form, error, {
        fallbackMessage: 'Registration failed',
      });
    },
  });

  return {
    sendCodeMutation,
    registerMutation,
  };
};


'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/features/auth/model/context/auth-context';
import { useLoginMutation } from '@/features/auth/model/hooks/use-login-mutation';
import { loginSchema } from '@/features/auth/model/validation/auth-schemas';

import type { LoginFormValues } from '@/features/auth/model/validation/auth-schemas';

export const useLoginForm = () => {
  const auth = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodFormResolver<LoginFormValues>(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { mutation } = useLoginMutation({
    form,
    setSession: auth.setSession,
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

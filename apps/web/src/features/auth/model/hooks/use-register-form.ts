'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRegisterMutations } from '@/features/auth/model/hooks/use-register-mutations';
import { registerSchema } from '@/features/auth/model/validation/auth-schemas';

import type { RegisterFormValues } from '@/features/auth/model/validation/auth-schemas';

export const useRegisterForm = () => {
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

  const { sendCodeMutation, registerMutation } = useRegisterMutations({ form, setStatus });

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

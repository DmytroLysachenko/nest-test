'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { UseFormReturn } from 'react-hook-form';

import { login } from '@/features/auth/api/auth-api';
import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { setRootServerError } from '@/shared/lib/forms/set-root-server-error';

import type { LoginFormValues } from '@/features/auth/model/validation/auth-schemas';
import type { UserDto } from '@/shared/types/api';

type UseLoginMutationArgs = {
  form: UseFormReturn<LoginFormValues>;
  setSession: (accessToken: string, refreshToken: string, user: UserDto) => void;
};

export const useLoginMutation = ({ form, setSession }: UseLoginMutationArgs) => {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (response) => {
      setSession(response.accessToken, response.refreshToken, response.user);
      try {
        const [profileInput, latestProfile] = await Promise.all([
          getLatestProfileInput(response.accessToken),
          getLatestCareerProfile(response.accessToken),
        ]);

        if (!profileInput || latestProfile?.status !== 'READY') {
          router.push('/app/onboarding');
          return;
        }

        router.push('/app');
      } catch {
        router.push('/app');
      }
    },
    onError: (error: unknown) => {
      setRootServerError(form, error, {
        fallbackMessage: 'Login failed',
      });
    },
  });

  return {
    mutation,
  };
};


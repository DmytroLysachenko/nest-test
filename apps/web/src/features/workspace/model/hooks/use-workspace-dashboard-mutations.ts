'use client';

import { useMutation } from '@tanstack/react-query';

import { logout } from '@/features/auth/api/auth-api';

type UseWorkspaceDashboardMutationsArgs = {
  token: string | null;
  clearSession: () => void;
};

export const useWorkspaceDashboardMutations = ({ token, clearSession }: UseWorkspaceDashboardMutationsArgs) => {
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        return;
      }
      await logout(token);
    },
    onSettled: () => clearSession(),
  });

  return {
    logoutMutation,
  };
};

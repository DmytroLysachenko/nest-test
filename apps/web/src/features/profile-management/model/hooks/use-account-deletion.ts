import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { deleteCurrentUser } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/context/auth-context';

export const useAccountDeletion = () => {
  const router = useRouter();
  const auth = useRequireAuth();

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        throw new Error('Missing session token');
      }
      return deleteCurrentUser(auth.token);
    },
    onSuccess: () => {
      auth.clearSession();
      router.replace('/login');
    },
  });

  return {
    deleteAccountMutation,
  };
};

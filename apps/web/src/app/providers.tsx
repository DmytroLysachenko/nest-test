'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useState } from 'react';

import { AuthProvider } from '@/features/auth/model/context/auth-context';
import { createQueryClient } from '@/shared/lib/query/query-client';
import { AppToaster } from '@/shared/ui/toaster';

import type { UserDto } from '@/shared/types/api';

export const Providers = ({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: { token: string | null; user: UserDto | null };
}) => {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={initialSession}>
        {children}
        <AppToaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
};

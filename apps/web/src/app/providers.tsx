'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';

import { AuthProvider } from '@/features/auth/model/context/auth-context';
import { createQueryClient } from '@/shared/lib/query/query-client';
import { AppToaster } from '@/shared/ui/toaster';

import type { UserDto } from '@/shared/types/api';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((module) => module.ReactQueryDevtools), {
        ssr: false,
      })
    : null;

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
        {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </AuthProvider>
    </QueryClientProvider>
  );
};

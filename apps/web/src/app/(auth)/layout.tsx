'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/model/context/auth-context';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

export default function PublicAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isHydrated && !auth.isLoading && auth.isAuthenticated) {
      router.replace('/');
    }
  }, [auth.isHydrated, auth.isLoading, auth.isAuthenticated, router]);

  if (!auth.isHydrated || auth.isLoading) {
    return (
      <WorkspaceSplashState
        title="Preparing sign-in"
        subtitle="Checking whether a private session is already active before loading authentication screens..."
      />
    );
  }

  if (auth.isAuthenticated) {
    return null;
  }

  return children;
}

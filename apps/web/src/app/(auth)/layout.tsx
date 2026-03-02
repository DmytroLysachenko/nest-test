'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/model/context/auth-context';

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
    return <main className="text-muted-foreground mx-auto max-w-md px-4 py-10 text-sm">Checking session...</main>;
  }

  if (auth.isAuthenticated) {
    return null;
  }

  return children;
}

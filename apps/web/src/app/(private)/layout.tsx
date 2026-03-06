'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { AppShell } from '@/shared/ui/app-shell';

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = useRequireAuth();

  if (!auth.isHydrated || auth.isLoading || !auth.isAuthenticated) {
    return <main className="text-muted-foreground mx-auto max-w-6xl px-4 py-10 text-sm">Checking session...</main>;
  }

  return (
    <AppShell
      userEmail={auth.user?.email}
      token={auth.token}
      onSignOut={() => {
        auth.clearSession();
      }}
    >
      {children}
    </AppShell>
  );
}

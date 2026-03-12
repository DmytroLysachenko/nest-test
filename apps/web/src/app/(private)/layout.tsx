'use client';

import { usePathname } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { PrivateDashboardDataProvider } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { AppShell } from '@/shared/ui/app-shell';

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = useRequireAuth();
  const pathname = usePathname();

  if (!auth.isHydrated || auth.isLoading || !auth.isAuthenticated) {
    return <main className="text-muted-foreground mx-auto max-w-6xl px-4 py-10 text-sm">Checking session...</main>;
  }

  const isSetupFlow = pathname === '/onboarding';

  return (
    <PrivateDashboardDataProvider token={auth.token}>
      <AppShell
        userEmail={auth.user?.email}
        userRole={auth.user?.role}
        token={auth.token}
        onSignOut={() => {
          auth.clearSession();
        }}
        hideSidebar={isSetupFlow}
      >
        {children}
      </AppShell>
    </PrivateDashboardDataProvider>
  );
}

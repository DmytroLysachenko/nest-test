'use client';

import { usePathname } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { PrivateDashboardDataProvider } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { AppShell } from '@/shared/ui/app-shell';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = useRequireAuth();
  const pathname = usePathname();

  if (!auth.isHydrated || auth.isLoading || !auth.isAuthenticated) {
    return (
      <WorkspaceSplashState
        title="Restoring your workspace"
        subtitle="Checking session state, warming up private data, and keeping navigation ready for a smooth handoff."
      />
    );
  }

  const isSetupFlow = pathname === '/onboarding';

  return (
    <PrivateDashboardDataProvider token={auth.token}>
      <AppShell
        userEmail={auth.user?.email}
        userRole={auth.user?.role}
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

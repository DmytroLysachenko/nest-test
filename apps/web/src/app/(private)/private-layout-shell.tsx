'use client';

import { useMutation } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

import { logout } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { PrivateDashboardDataProvider } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { AppShell } from '@/shared/ui/app-shell';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

import type { WorkspaceSummaryDto } from '@/shared/types/api';

type PrivateLayoutShellProps = {
  children: React.ReactNode;
  initialData?: {
    summary?: WorkspaceSummaryDto | null;
  };
};

export const PrivateLayoutShell = ({ children, initialData }: PrivateLayoutShellProps) => {
  const auth = useRequireAuth();
  const pathname = usePathname();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        return;
      }
      await logout(auth.token);
    },
    onSettled: () => auth.clearSession(),
  });

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
    <PrivateDashboardDataProvider token={auth.token} initialData={initialData}>
      <AppShell
        userEmail={auth.user?.email}
        userRole={auth.user?.role}
        onSignOut={() => logoutMutation.mutate()}
        hideSidebar={isSetupFlow}
      >
        {children}
      </AppShell>
    </PrivateDashboardDataProvider>
  );
};

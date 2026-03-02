'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { AppHeader, AppSidebar } from '@/shared/ui/app-header';

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
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <AppHeader />
        {children}
      </div>
    </div>
  );
}

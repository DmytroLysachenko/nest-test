'use client';

import { useSearchParams } from 'next/navigation';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { CompaniesPage } from '@/features/companies';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

export default function CompaniesRoute() {
  const auth = useRequireAuth();
  const searchParams = useSearchParams();

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Checking company access"
        subtitle="Restoring your private session before loading company discovery."
      />
    );
  }

  const initialPageParam = Number(searchParams.get('page'));

  return (
    <CompaniesPage
      token={auth.token}
      initialSearch={searchParams.get('search')}
      initialLocation={searchParams.get('location')}
      initialPage={Number.isFinite(initialPageParam) && initialPageParam > 0 ? initialPageParam : 1}
    />
  );
}

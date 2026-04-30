'use client';

import { use } from 'react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { CompanyDetailPage } from '@/features/companies';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

export default function CompanyDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const auth = useRequireAuth();
  const resolvedParams = use(params);

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Checking company access"
        subtitle="Restoring your private session before loading company detail."
      />
    );
  }

  return <CompanyDetailPage token={auth.token} companyId={resolvedParams.id} />;
}

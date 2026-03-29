'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

import { TesterPage } from './tester-page';

export const TesterGate = () => {
  const auth = useRequireAuth();

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Opening Tester Workspace"
        subtitle="Checking the current session before exposing internal request and verification tools..."
      />
    );
  }

  return <TesterPage token={auth.token} />;
};

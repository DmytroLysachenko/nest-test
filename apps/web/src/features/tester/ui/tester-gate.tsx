'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';

import { TesterPage } from './tester-page';

export const TesterGate = () => {
  const auth = useRequireAuth();

  if (!auth.token) {
    return <main className="app-page text-muted-foreground text-sm">Checking session...</main>;
  }

  return <TesterPage token={auth.token} />;
};

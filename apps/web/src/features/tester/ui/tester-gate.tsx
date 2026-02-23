'use client';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';

import { TesterPage } from './tester-page';

export const TesterGate = () => {
  const auth = useRequireAuth();

  if (!auth.token) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking session...</main>;
  }

  return <TesterPage token={auth.token} />;
};

'use client';

import { useRequireAuth } from '@/features/auth/model/auth-context';
import { NotebookPage } from '@/features/job-offers/ui/notebook-page';

export default function AppNotebookRoute() {
  const auth = useRequireAuth();

  if (!auth.token) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking session...</main>;
  }

  return <NotebookPage token={auth.token} />;
}
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRequireAuth } from '@/features/auth/model/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { useWorkflowState } from '@/features/workflow/model/use-workflow-state';

export default function AppNotebookRoute() {
  const router = useRouter();
  const auth = useRequireAuth();
  const workflow = useWorkflowState(auth.token);

  useEffect(() => {
    if (!auth.token) {
      return;
    }
    if (!workflow.isLoading && !workflow.allowNotebook) {
      router.replace('/app?blocked=notebook');
    }
  }, [auth.token, router, workflow.allowNotebook, workflow.isLoading]);

  if (!auth.token) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking session...</main>;
  }

  if (workflow.isLoading) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking notebook readiness...</main>;
  }

  if (!workflow.allowNotebook) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">
        Notebook is locked until a scrape run completes.
      </main>
    );
  }

  return <NotebookPage token={auth.token} />;
}

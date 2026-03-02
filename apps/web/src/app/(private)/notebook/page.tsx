'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { useWorkflowState } from '@/features/workflow/model/use-workflow-state';

export default function NotebookRoute() {
  const router = useRouter();
  const auth = useRequireAuth();
  const workflow = useWorkflowState(auth.token);

  useEffect(() => {
    if (!auth.token) {
      return;
    }
    if (!workflow.isLoading && !workflow.allowNotebook) {
      router.replace('/?blocked=notebook');
    }
  }, [auth.token, router, workflow.allowNotebook, workflow.isLoading]);

  if (!auth.token) {
    return <main className="app-page text-muted-foreground text-sm">Checking session...</main>;
  }

  if (workflow.isLoading) {
    return <main className="app-page text-muted-foreground text-sm">Checking notebook readiness...</main>;
  }

  if (!workflow.allowNotebook) {
    return (
      <main className="app-page text-muted-foreground text-sm">Notebook is locked until a scrape run completes.</main>
    );
  }

  return <NotebookPage token={auth.token} />;
}

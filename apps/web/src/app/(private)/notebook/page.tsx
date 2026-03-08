'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Lock } from 'lucide-react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { NotebookPage } from '@/features/job-offers';
import { useWorkflowState } from '@/features/workflow/model/use-workflow-state';
import { PageLoadingState } from '@/shared/ui/async-states';
import { EmptyState } from '@/shared/ui/empty-state';

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
    return <PageLoadingState title="Checking session" subtitle="Validating your JobSeeker access..." />;
  }

  if (workflow.isLoading) {
    return (
      <PageLoadingState title="Checking notebook readiness" subtitle="Validating profile and scrape prerequisites..." />
    );
  }

  if (!workflow.allowNotebook) {
    return (
      <main className="app-page">
        <EmptyState
          icon={<Lock className="h-8 w-8" />}
          title="Notebook is locked"
          description="Complete onboarding and finish at least one scrape run to unlock offer triage."
          actionLabel="Go to dashboard"
          onAction={() => router.push('/')}
        />
      </main>
    );
  }

  return <NotebookPage token={auth.token} />;
}

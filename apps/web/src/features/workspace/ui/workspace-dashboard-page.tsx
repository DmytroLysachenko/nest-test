'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { logout } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/auth-context';
import { CareerProfilePanel } from '@/features/career-profiles';
import { DocumentsPanel } from '@/features/documents';
import { JobMatchingPanel } from '@/features/job-matching';
import { JobSourcesPanel } from '@/features/job-sources';
import { ProfileInputPanel } from '@/features/profile-inputs';
import { useWorkflowState, WorkflowOverviewCard } from '@/features/workflow';
import { env } from '@/shared/config/env';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { Button } from '@/shared/ui/button';

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const searchParams = useSearchParams();
  const workflow = useWorkflowState(auth.token);
  const setLastVisitedSection = useAppUiStore((state) => state.setLastVisitedSection);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        return;
      }
      await logout(auth.token);
    },
    onSettled: () => {
      auth.clearSession();
    },
  });

  if (!auth.token) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking session...</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-100/60 p-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Career Assistant Workspace</h1>
          <p className="text-sm text-slate-700">Signed in as {auth.user?.email ?? 'unknown user'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            href="/app/profile"
            onClick={() => setLastVisitedSection('profile')}
          >
            Open profile management
          </Link>
          {workflow.allowNotebook ? (
            <Link
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              href="/app/notebook"
              onClick={() => setLastVisitedSection('notebook')}
            >
              Open notebook
            </Link>
          ) : (
            <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-400">
              Notebook locked
            </span>
          )}
          <Button variant="secondary" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>

      {testerEnabled ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm text-slate-700">
            Internal testing is enabled. Open{' '}
            <Link className="font-semibold text-sky-700 underline" href="/app/tester">
              /app/tester
            </Link>{' '}
            to test API and worker endpoints.
          </p>
        </section>
      ) : null}

      {searchParams.get('blocked') === 'notebook' ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Notebook access requires at least one completed scrape run or existing materialized offers.
        </section>
      ) : null}

      <WorkflowOverviewCard
        completedSteps={workflow.completedSteps}
        totalSteps={workflow.totalSteps}
        isLoading={workflow.isLoading}
        steps={workflow.steps}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileInputPanel token={auth.token} />
        <DocumentsPanel
          token={auth.token}
          disabled={!workflow.allowDocumentsActions}
          disabledReason="Save profile input first, then upload and extract documents."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CareerProfilePanel
          token={auth.token}
          disabled={!workflow.allowProfileGeneration}
          disabledReason="At least one document must be extracted (READY) before profile generation."
        />
        <JobMatchingPanel
          token={auth.token}
          disabled={!workflow.allowJobMatching}
          disabledReason="Generate a READY career profile before deterministic job matching."
        />
      </div>

      <JobSourcesPanel
        token={auth.token}
        disabled={!workflow.allowScrapeEnqueue}
        disabledReason="Generate a READY career profile before enqueuing scrape runs."
      />
    </main>
  );
};

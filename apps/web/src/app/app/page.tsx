'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';

import { logout } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/auth-context';
import { CareerProfilePanel } from '@/features/career-profiles/ui/career-profile-panel';
import { DocumentsPanel } from '@/features/documents/ui/documents-panel';
import { JobMatchingPanel } from '@/features/job-matching/ui/job-matching-panel';
import { JobSourcesPanel } from '@/features/job-sources/ui/job-sources-panel';
import { ProfileInputPanel } from '@/features/profile-inputs/ui/profile-input-panel';
import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

export default function AppDashboardPage() {
  const auth = useRequireAuth();

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
        <Button variant="secondary" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
          {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
        </Button>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileInputPanel token={auth.token} />
        <DocumentsPanel token={auth.token} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CareerProfilePanel token={auth.token} />
        <JobMatchingPanel token={auth.token} />
      </div>

      <JobSourcesPanel token={auth.token} />
    </main>
  );
}

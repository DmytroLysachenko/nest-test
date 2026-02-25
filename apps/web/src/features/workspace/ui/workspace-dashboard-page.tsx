'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { logout } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { listJobSourceRuns } from '@/features/job-sources/api/job-sources-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export const WorkspaceDashboardPage = () => {
  const auth = useRequireAuth();
  const router = useRouter();

  const profileInputQuery = useQuery({
    queryKey: queryKeys.profileInputs.latest(auth.token),
    queryFn: () => getLatestProfileInput(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const latestProfileQuery = useQuery({
    queryKey: queryKeys.careerProfiles.latest(auth.token),
    queryFn: () => getLatestCareerProfile(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const offersQuery = useQuery({
    queryKey: queryKeys.jobOffers.list(auth.token, { limit: 8, offset: 0, mode: 'strict' }),
    queryFn: () => listJobOffers(auth.token as string, { limit: 8, offset: 0, mode: 'strict' }),
    enabled: Boolean(auth.token),
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.jobSources.runs(auth.token),
    queryFn: () => listJobSourceRuns(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        return;
      }
      await logout(auth.token);
    },
    onSettled: () => auth.clearSession(),
  });

  const isLoading = profileInputQuery.isLoading || latestProfileQuery.isLoading || offersQuery.isLoading || runsQuery.isLoading;
  const hasReadyProfile = latestProfileQuery.data?.status === 'READY';

  useEffect(() => {
    if (!auth.isHydrated || auth.isLoading) {
      return;
    }
    if (!auth.token) {
      return;
    }
    if (profileInputQuery.isLoading || latestProfileQuery.isLoading) {
      return;
    }
    if (!profileInputQuery.data || !hasReadyProfile) {
      router.replace('/app/onboarding');
    }
  }, [
    auth.isHydrated,
    auth.isLoading,
    auth.token,
    hasReadyProfile,
    latestProfileQuery.isLoading,
    profileInputQuery.data,
    profileInputQuery.isLoading,
    router,
  ]);

  if (!auth.token || isLoading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">Loading workspace...</main>;
  }

  const latestRun = runsQuery.data?.items[0] ?? null;
  const offers = offersQuery.data?.items ?? [];
  const totalOffers = offersQuery.data?.total ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Job Search Dashboard</h1>
          <p className="text-sm text-slate-600">Signed in as {auth.user?.email ?? 'unknown user'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/notebook" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Open notebook
          </Link>
          <Link href="/app/profile" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Manage profile
          </Link>
          <Link href="/app/onboarding" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            Recreate profile
          </Link>
          <Button variant="secondary" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
            {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Profile" description="Current search profile status">
          <p className="text-sm text-slate-700">Status: {latestProfileQuery.data?.status ?? 'n/a'}</p>
          <p className="text-sm text-slate-700">Version: {latestProfileQuery.data?.version ?? 'n/a'}</p>
        </Card>
        <Card title="Scrape Runs" description="Latest ingestion state">
          <p className="text-sm text-slate-700">Last run status: {latestRun?.status ?? 'n/a'}</p>
          <p className="text-sm text-slate-700">Total runs: {runsQuery.data?.total ?? 0}</p>
        </Card>
        <Card title="Notebook" description="Materialized offers in your notebook">
          <p className="text-sm text-slate-700">Total offers: {totalOffers}</p>
          <p className="text-sm text-slate-700">Mode: strict</p>
        </Card>
      </div>

      <Card title="Recent offers" description="Quick preview of top offers from your notebook.">
        {offers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-900">{offer.title}</td>
                    <td className="py-2 text-slate-700">{offer.company}</td>
                    <td className="py-2 text-slate-700">{offer.location ?? 'n/a'}</td>
                    <td className="py-2 text-slate-700">{offer.matchScore == null ? 'n/a' : offer.matchScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No offers yet. Enqueue scrape from notebook or tester tools.</p>
        )}
      </Card>
    </main>
  );
};

import { getPrivateDashboardBootstrap } from '@/shared/lib/dashboard/private-dashboard-bootstrap.server';

import { PrivateLayoutShell } from './private-layout-shell';

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bootstrap = await getPrivateDashboardBootstrap();

  return (
    <PrivateLayoutShell
      initialData={{
        summary: bootstrap.summary,
        latestProfileInput: bootstrap.latestProfileInput,
        latestCareerProfile: bootstrap.latestCareerProfile,
        documents: bootstrap.documents,
        notebookSummary: bootstrap.notebookSummary,
        scrapeSchedule: bootstrap.scrapeSchedule,
      }}
    >
      {children}
    </PrivateLayoutShell>
  );
}

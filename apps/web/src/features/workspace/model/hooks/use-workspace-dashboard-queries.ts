'use client';

import { useQuery } from '@tanstack/react-query';

import { getDocumentDiagnosticsSummary } from '@/features/documents/api/documents-api';
import { getJobSourceRunDiagnosticsSummary } from '@/features/job-sources/api/job-sources-api';
import { getJobOffersPreview, listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useWorkspaceDashboardQueries = (token: string | null) => {
  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.workflow.summary(token),
      queryFn: getWorkspaceSummary,
    }),
  );

  const offersQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, { limit: 8, offset: 0, mode: 'strict' }),
      queryFn: (authToken) => listJobOffers(authToken, { limit: 8, offset: 0, mode: 'strict' }),
      select: getJobOffersPreview,
    }),
  );

  const diagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.diagnosticsSummary(token, 72),
      queryFn: (authToken) => getJobSourceRunDiagnosticsSummary(authToken, 72),
      refetchInterval: 30000,
    }),
  );

  const documentDiagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.diagnosticsSummary(token, 168),
      queryFn: (authToken) => getDocumentDiagnosticsSummary(authToken, 168),
      refetchInterval: 30000,
    }),
  );

  return {
    summaryQuery,
    offersQuery,
    diagnosticsSummaryQuery,
    documentDiagnosticsSummaryQuery,
  };
};

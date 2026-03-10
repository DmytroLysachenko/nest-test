'use client';

import { useQuery } from '@tanstack/react-query';

import { getDocumentDiagnosticsSummary } from '@/features/documents/api/documents-api';
import { getJobSourceRunDiagnosticsSummary, getScrapeSchedule } from '@/features/job-sources/api/job-sources-api';
import {
  getJobOfferFocus,
  getJobOffersPreview,
  getNotebookSummary,
  listJobOffers,
} from '@/features/job-offers/api/job-offers-api';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import { env } from '@/shared/config/env';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

export const useWorkspaceDashboardQueries = (token: string | null) => {
  const summaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.workflow.summary(token),
      queryFn: getWorkspaceSummary,
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    }),
  );

  const offersQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.list(token, { limit: 8, offset: 0, mode: 'strict' }),
      queryFn: (authToken) => listJobOffers(authToken, { limit: 8, offset: 0, mode: 'strict' }),
      select: getJobOffersPreview,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const diagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.diagnosticsSummary(token, 72),
      queryFn: (authToken) => getJobSourceRunDiagnosticsSummary(authToken, 72),
      enabled: diagnosticsEnabled,
      refetchInterval: env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS,
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  const documentDiagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.diagnosticsSummary(token, 168),
      queryFn: (authToken) => getDocumentDiagnosticsSummary(authToken, 168),
      enabled: diagnosticsEnabled,
      refetchInterval: env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS,
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  const notebookSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const focusQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobOffers.focus(token),
      queryFn: getJobOfferFocus,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  const scheduleQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
    }),
  );

  return {
    summaryQuery,
    offersQuery,
    diagnosticsSummaryQuery,
    documentDiagnosticsSummaryQuery,
    notebookSummaryQuery,
    focusQuery,
    scheduleQuery,
  };
};

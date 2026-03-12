'use client';

import { useQuery } from '@tanstack/react-query';

import { getDocumentDiagnosticsSummary } from '@/features/documents/api/documents-api';
import { getJobSourceRunDiagnosticsSummary } from '@/features/job-sources/api/job-sources-api';
import { getJobOfferFocus, getJobOffersPreview, listJobOffers } from '@/features/job-offers/api/job-offers-api';
import { env } from '@/shared/config/env';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableQueryPreset, liveQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type {
  DocumentDiagnosticsSummaryDto,
  JobOfferFocusDto,
  JobOffersListDto,
  JobSourceRunDiagnosticsSummaryDto,
} from '@/shared/types/api';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

export const useWorkspaceDashboardQueries = (token: string | null) => {
  const offersQuery = useQuery(
    buildAuthedQueryOptions<JobOffersListDto, ReturnType<typeof getJobOffersPreview>>({
      token,
      queryKey: queryKeys.jobOffers.list(token, { limit: 8, offset: 0, mode: 'strict' }),
      queryFn: (authToken) => listJobOffers(authToken, { limit: 8, offset: 0, mode: 'strict' }),
      select: getJobOffersPreview,
      ...mutableQueryPreset(),
    }),
  );

  const diagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions<JobSourceRunDiagnosticsSummaryDto>({
      token,
      queryKey: queryKeys.jobSources.diagnosticsSummary(token, 72),
      queryFn: (authToken) => getJobSourceRunDiagnosticsSummary(authToken, 72),
      ...liveQueryPreset(),
      enabled: diagnosticsEnabled,
      refetchInterval: env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS,
    }),
  );

  const documentDiagnosticsSummaryQuery = useQuery(
    buildAuthedQueryOptions<DocumentDiagnosticsSummaryDto>({
      token,
      queryKey: queryKeys.documents.diagnosticsSummary(token, 168),
      queryFn: (authToken) => getDocumentDiagnosticsSummary(authToken, 168),
      ...liveQueryPreset(),
      enabled: diagnosticsEnabled,
      refetchInterval: env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS,
    }),
  );

  const focusQuery = useQuery(
    buildAuthedQueryOptions<JobOfferFocusDto>({
      token,
      queryKey: queryKeys.jobOffers.focus(token),
      queryFn: getJobOfferFocus,
      ...mutableQueryPreset(),
    }),
  );

  return {
    offersQuery,
    diagnosticsSummaryQuery,
    documentDiagnosticsSummaryQuery,
    focusQuery,
  };
};

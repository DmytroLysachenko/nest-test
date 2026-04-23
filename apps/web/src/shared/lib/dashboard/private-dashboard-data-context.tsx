'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { getNotebookSummary } from '@/features/job-offers/api/job-offers-api';
import { getScrapeSchedule } from '@/features/job-sources/api/job-sources-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import { env } from '@/shared/config/env';
import {
  normalizeNotebookSummary,
  normalizeScrapeSchedule,
  normalizeWorkspaceSummary,
  type PrivateDashboardNotebookSummary,
  type PrivateDashboardSchedule,
  type PrivateDashboardSummary,
} from '@/shared/lib/dashboard/private-dashboard-data-normalizers';
import { WORKSPACE_RATE_LIMIT_MESSAGE, isRateLimitedError } from '@/shared/lib/http/rate-limit';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { mutableQueryPreset, staticQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type {
  CareerProfileDto,
  DocumentDto,
  JobOfferSummaryDto,
  ProfileInputDto,
  ScrapeScheduleDto,
  WorkspaceSummaryDto,
} from '@/shared/types/api';

type PrivateDashboardDataValue = {
  token: string | null;
  summary: PrivateDashboardSummary | null;
  latestProfileInput: ProfileInputDto | null;
  latestCareerProfile: CareerProfileDto | null;
  documents: DocumentDto[];
  notebookSummary: PrivateDashboardNotebookSummary;
  scrapeSchedule: PrivateDashboardSchedule;
  isBootstrapping: boolean;
  summaryError: string | null;
  refreshSummary: () => Promise<unknown>;
  refreshDocuments: () => Promise<unknown>;
  refreshNotebookSummary: () => Promise<unknown>;
  refreshSchedule: () => Promise<unknown>;
};

const PrivateDashboardDataContext = createContext<PrivateDashboardDataValue | null>(null);
const ACTIVE_DASHBOARD_POLL_INTERVAL_MS = Math.max(env.NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS, 60_000);

export const PrivateDashboardDataProvider = ({
  token,
  initialData,
  children,
}: {
  token: string | null;
  initialData?: {
    summary?: WorkspaceSummaryDto | null;
    latestProfileInput?: ProfileInputDto | null;
    latestCareerProfile?: CareerProfileDto | null;
    documents?: DocumentDto[] | null;
    notebookSummary?: JobOfferSummaryDto | null;
    scrapeSchedule?: ScrapeScheduleDto | null;
  };
  children: React.ReactNode;
}) => {
  const summaryQuery = useQuery(
    buildAuthedQueryOptions<WorkspaceSummaryDto>({
      token,
      queryKey: queryKeys.workflow.summary(token),
      queryFn: getWorkspaceSummary,
      initialData: initialData?.summary ?? undefined,
      ...staticQueryPreset(),
      refetchInterval: (query) => {
        if (isRateLimitedError(query.state.error)) {
          return false;
        }
        const summary = query.state.data as WorkspaceSummaryDto | undefined;
        const status = summary?.scrape.lastRunStatus;
        return status === 'PENDING' || status === 'RUNNING' ? ACTIVE_DASHBOARD_POLL_INTERVAL_MS : false;
      },
    }),
  );

  const latestProfileInputQuery = useQuery(
    buildAuthedQueryOptions<ProfileInputDto | null>({
      token,
      queryKey: queryKeys.profileInputs.latest(token),
      queryFn: getLatestProfileInput,
      initialData: initialData?.latestProfileInput ?? undefined,
      ...staticQueryPreset(),
    }),
  );

  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions<CareerProfileDto | null>({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      initialData: initialData?.latestCareerProfile ?? undefined,
      ...staticQueryPreset(),
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions<DocumentDto[]>({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      initialData: initialData?.documents ?? undefined,
      ...mutableQueryPreset(),
      refetchInterval: (query) => {
        if (isRateLimitedError(query.state.error)) {
          return false;
        }
        const documents = (query.state.data as DocumentDto[] | undefined) ?? [];
        return documents.some((item) => item.extractionStatus === 'PENDING')
          ? ACTIVE_DASHBOARD_POLL_INTERVAL_MS
          : false;
      },
    }),
  );

  const notebookSummaryQuery = useQuery(
    buildAuthedQueryOptions<JobOfferSummaryDto>({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      initialData: initialData?.notebookSummary ?? undefined,
      ...mutableQueryPreset(),
    }),
  );

  const scrapeScheduleQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleDto>({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      initialData: initialData?.scrapeSchedule ?? undefined,
      ...mutableQueryPreset(),
    }),
  );

  const value = useMemo<PrivateDashboardDataValue>(() => {
    const summary = normalizeWorkspaceSummary(summaryQuery.data);
    const isSummaryBootstrapping = summaryQuery.data === undefined && summaryQuery.isPending && !summaryQuery.isError;
    const isLatestProfileInputBootstrapping =
      latestProfileInputQuery.data === undefined &&
      latestProfileInputQuery.isPending &&
      !latestProfileInputQuery.isError;
    const isLatestCareerProfileBootstrapping =
      latestCareerProfileQuery.data === undefined &&
      latestCareerProfileQuery.isPending &&
      !latestCareerProfileQuery.isError;
    const isDocumentsBootstrapping =
      documentsQuery.data === undefined && documentsQuery.isPending && !documentsQuery.isError;
    const summaryError =
      !summary && summaryQuery.isError
        ? toUserErrorMessage(summaryQuery.error, 'Unable to load workspace summary.', {
            byCode: {
              RATE_LIMITED: WORKSPACE_RATE_LIMIT_MESSAGE,
            },
            byStatus: {
              429: WORKSPACE_RATE_LIMIT_MESSAGE,
            },
          })
        : null;

    return {
      token,
      summary,
      latestProfileInput: latestProfileInputQuery.data ?? null,
      latestCareerProfile: latestCareerProfileQuery.data ?? null,
      documents: documentsQuery.data ?? [],
      notebookSummary: normalizeNotebookSummary(notebookSummaryQuery.data),
      scrapeSchedule: normalizeScrapeSchedule(scrapeScheduleQuery.data),
      isBootstrapping:
        !token ||
        isSummaryBootstrapping ||
        isLatestProfileInputBootstrapping ||
        isLatestCareerProfileBootstrapping ||
        isDocumentsBootstrapping,
      summaryError,
      refreshSummary: summaryQuery.refetch,
      refreshDocuments: documentsQuery.refetch,
      refreshNotebookSummary: notebookSummaryQuery.refetch,
      refreshSchedule: scrapeScheduleQuery.refetch,
    };
  }, [
    documentsQuery.data,
    documentsQuery.isError,
    documentsQuery.isPending,
    documentsQuery.refetch,
    latestCareerProfileQuery.data,
    latestCareerProfileQuery.isError,
    latestCareerProfileQuery.isPending,
    latestProfileInputQuery.data,
    latestProfileInputQuery.isError,
    latestProfileInputQuery.isPending,
    notebookSummaryQuery.data,
    notebookSummaryQuery.refetch,
    scrapeScheduleQuery.data,
    scrapeScheduleQuery.refetch,
    summaryQuery.data,
    summaryQuery.error,
    summaryQuery.isError,
    summaryQuery.isPending,
    summaryQuery.refetch,
    token,
  ]);

  return <PrivateDashboardDataContext.Provider value={value}>{children}</PrivateDashboardDataContext.Provider>;
};

export const usePrivateDashboardData = () => {
  const context = useContext(PrivateDashboardDataContext);
  if (!context) {
    throw new Error('usePrivateDashboardData must be used within PrivateDashboardDataProvider');
  }
  return context;
};

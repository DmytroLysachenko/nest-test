'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { getNotebookSummary } from '@/features/job-offers/api/job-offers-api';
import { getScrapeSchedule } from '@/features/job-sources/api/job-sources-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import {
  normalizeNotebookSummary,
  normalizeScrapeSchedule,
  normalizeWorkspaceSummary,
  type PrivateDashboardNotebookSummary,
  type PrivateDashboardSchedule,
  type PrivateDashboardSummary,
} from '@/shared/lib/dashboard/private-dashboard-data-normalizers';
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
  refreshSummary: () => Promise<unknown>;
  refreshDocuments: () => Promise<unknown>;
  refreshNotebookSummary: () => Promise<unknown>;
  refreshSchedule: () => Promise<unknown>;
};

const PrivateDashboardDataContext = createContext<PrivateDashboardDataValue | null>(null);

export const PrivateDashboardDataProvider = ({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) => {
  const summaryQuery = useQuery(
    buildAuthedQueryOptions<WorkspaceSummaryDto>({
      token,
      queryKey: queryKeys.workflow.summary(token),
      queryFn: getWorkspaceSummary,
      ...staticQueryPreset(),
      refetchInterval: (query) => {
        const summary = query.state.data as WorkspaceSummaryDto | undefined;
        const status = summary?.scrape.lastRunStatus;
        return status === 'PENDING' || status === 'RUNNING' ? 8_000 : false;
      },
    }),
  );

  const latestProfileInputQuery = useQuery(
    buildAuthedQueryOptions<ProfileInputDto | null>({
      token,
      queryKey: queryKeys.profileInputs.latest(token),
      queryFn: getLatestProfileInput,
      ...staticQueryPreset(),
    }),
  );

  const latestCareerProfileQuery = useQuery(
    buildAuthedQueryOptions<CareerProfileDto | null>({
      token,
      queryKey: queryKeys.careerProfiles.latest(token),
      queryFn: getLatestCareerProfile,
      ...staticQueryPreset(),
    }),
  );

  const documentsQuery = useQuery(
    buildAuthedQueryOptions<DocumentDto[]>({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      ...mutableQueryPreset(),
      refetchInterval: (query) => {
        const documents = (query.state.data as DocumentDto[] | undefined) ?? [];
        return documents.some((item) => item.extractionStatus === 'PENDING') ? 2_500 : false;
      },
    }),
  );

  const notebookSummaryQuery = useQuery(
    buildAuthedQueryOptions<JobOfferSummaryDto>({
      token,
      queryKey: queryKeys.jobOffers.summary(token),
      queryFn: getNotebookSummary,
      ...mutableQueryPreset(),
    }),
  );

  const scrapeScheduleQuery = useQuery(
    buildAuthedQueryOptions<ScrapeScheduleDto>({
      token,
      queryKey: queryKeys.jobSources.schedule(token),
      queryFn: getScrapeSchedule,
      ...mutableQueryPreset(),
    }),
  );

  const value = useMemo<PrivateDashboardDataValue>(
    () => ({
      token,
      summary: normalizeWorkspaceSummary(summaryQuery.data),
      latestProfileInput: latestProfileInputQuery.data ?? null,
      latestCareerProfile: latestCareerProfileQuery.data ?? null,
      documents: documentsQuery.data ?? [],
      notebookSummary: normalizeNotebookSummary(notebookSummaryQuery.data),
      scrapeSchedule: normalizeScrapeSchedule(scrapeScheduleQuery.data),
      isBootstrapping:
        !token ||
        summaryQuery.isLoading ||
        latestProfileInputQuery.isLoading ||
        latestCareerProfileQuery.isLoading ||
        documentsQuery.isLoading,
      refreshSummary: summaryQuery.refetch,
      refreshDocuments: documentsQuery.refetch,
      refreshNotebookSummary: notebookSummaryQuery.refetch,
      refreshSchedule: scrapeScheduleQuery.refetch,
    }),
    [
      documentsQuery.data,
      documentsQuery.isLoading,
      documentsQuery.refetch,
      latestCareerProfileQuery.data,
      latestCareerProfileQuery.isLoading,
      latestProfileInputQuery.data,
      latestProfileInputQuery.isLoading,
      notebookSummaryQuery.data,
      notebookSummaryQuery.refetch,
      scrapeScheduleQuery.data,
      scrapeScheduleQuery.refetch,
      summaryQuery.data,
      summaryQuery.isLoading,
      summaryQuery.refetch,
      token,
    ],
  );

  return <PrivateDashboardDataContext.Provider value={value}>{children}</PrivateDashboardDataContext.Provider>;
};

export const usePrivateDashboardData = () => {
  const context = useContext(PrivateDashboardDataContext);
  if (!context) {
    throw new Error('usePrivateDashboardData must be used within PrivateDashboardDataProvider');
  }
  return context;
};

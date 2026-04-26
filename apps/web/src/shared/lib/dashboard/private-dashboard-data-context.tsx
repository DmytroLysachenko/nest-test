'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import {
  normalizeWorkspaceSummary,
  type PrivateDashboardSummary,
} from '@/shared/lib/dashboard/private-dashboard-data-normalizers';
import { WORKSPACE_RATE_LIMIT_MESSAGE, isRateLimitedError } from '@/shared/lib/http/rate-limit';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { staticQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { WorkspaceSummaryDto } from '@/shared/types/api';

type PrivateDashboardDataValue = {
  token: string | null;
  summary: PrivateDashboardSummary | null;
  isBootstrapping: boolean;
  summaryError: string | null;
  refreshSummary: () => Promise<unknown>;
};

const PrivateDashboardDataContext = createContext<PrivateDashboardDataValue | null>(null);

export const PrivateDashboardDataProvider = ({
  token,
  initialData,
  children,
}: {
  token: string | null;
  initialData?: {
    summary?: WorkspaceSummaryDto | null;
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
    }),
  );

  const value = useMemo<PrivateDashboardDataValue>(() => {
    const summary = normalizeWorkspaceSummary(summaryQuery.data);
    const isSummaryBootstrapping = summaryQuery.data === undefined && summaryQuery.isPending && !summaryQuery.isError;
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
      isBootstrapping: !token || isSummaryBootstrapping,
      summaryError,
      refreshSummary: summaryQuery.refetch,
    };
  }, [
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

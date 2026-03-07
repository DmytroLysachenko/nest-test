'use client';

import { useQuery } from '@tanstack/react-query';

import { getDocumentUploadHealth, listDocumentEvents, listDocuments } from '@/features/documents/api/documents-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';

export const useDocumentsPanelQueries = (token: string, selectedDocumentId: string | null) => {
  const documentsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      staleTime: QUERY_STALE_TIME.WORKFLOW_DATA,
      refetchInterval: (query) => {
        const docs = (query.state.data as Array<{ extractionStatus?: string }> | undefined) ?? [];
        return docs.some((item) => item.extractionStatus === 'PENDING') ? 2500 : false;
      },
    }),
  );

  const uploadHealthQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['documents', 'upload-health', token],
      queryFn: getDocumentUploadHealth,
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  const documentEventsQuery = useQuery(
    buildAuthedQueryOptions({
      token,
      queryKey: ['documents', 'events', token, selectedDocumentId],
      queryFn: (authToken) => listDocumentEvents(authToken, selectedDocumentId as string),
      enabled: Boolean(selectedDocumentId),
      staleTime: QUERY_STALE_TIME.DIAGNOSTICS_DATA,
    }),
  );

  return {
    documentsQuery,
    uploadHealthQuery,
    documentEventsQuery,
  };
};

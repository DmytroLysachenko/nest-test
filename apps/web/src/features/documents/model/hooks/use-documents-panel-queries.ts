'use client';

import { useQuery } from '@tanstack/react-query';

import { getDocumentUploadHealth, listDocumentEvents, listDocuments } from '@/features/documents/api/documents-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { liveQueryPreset, mutableQueryPreset } from '@/shared/lib/query/query-option-presets';
import { queryKeys } from '@/shared/lib/query/query-keys';

import type { DocumentDto, DocumentEventDto, DocumentUploadHealthDto } from '@/shared/types/api';

const diagnosticsEnabled = process.env.NODE_ENV !== 'production';

export const useDocumentsPanelQueries = (token: string, selectedDocumentId: string | null) => {
  const documentsQuery = useQuery(
    buildAuthedQueryOptions<DocumentDto[]>({
      token,
      queryKey: queryKeys.documents.list(token),
      queryFn: listDocuments,
      ...mutableQueryPreset(),
      refetchInterval: (query) => {
        const docs = (query.state.data as Array<{ extractionStatus?: string }> | undefined) ?? [];
        return docs.some((item) => item.extractionStatus === 'PENDING') ? 2500 : false;
      },
    }),
  );

  const uploadHealthQuery = useQuery(
    buildAuthedQueryOptions<DocumentUploadHealthDto>({
      token,
      queryKey: ['documents', 'upload-health', token],
      queryFn: getDocumentUploadHealth,
      ...liveQueryPreset(),
      enabled: diagnosticsEnabled,
    }),
  );

  const documentEventsQuery = useQuery(
    buildAuthedQueryOptions<DocumentEventDto[]>({
      token,
      queryKey: queryKeys.documents.events(token, selectedDocumentId),
      queryFn: (authToken) => listDocumentEvents(authToken, selectedDocumentId as string),
      ...liveQueryPreset(),
      enabled: diagnosticsEnabled && Boolean(selectedDocumentId),
    }),
  );

  return {
    documentsQuery,
    uploadHealthQuery,
    documentEventsQuery,
  };
};

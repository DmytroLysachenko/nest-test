'use client';

import { useState } from 'react';

import { useDocumentsPanelMutations } from '@/features/documents/model/hooks/use-documents-panel-mutations';
import { useDocumentsPanelQueries } from '@/features/documents/model/hooks/use-documents-panel-queries';

import type { DocumentDto } from '@/shared/types/api';

type UseDocumentsPanelArgs = {
  token: string;
  overrideDocumentsQuery?: {
    data?: DocumentDto[];
  };
};

export const useDocumentsPanel = ({ token, overrideDocumentsQuery }: UseDocumentsPanelArgs) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<'idle' | 'create-url' | 'upload' | 'confirm' | 'extract'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [recoverySummary, setRecoverySummary] = useState<string | null>(null);
  const [lastRecoveredDocumentId, setLastRecoveredDocumentId] = useState<string | null>(null);

  const {
    documentsQuery: internalDocumentsQuery,
    uploadHealthQuery,
    documentEventsQuery,
  } = useDocumentsPanelQueries(token, selectedDocumentId);

  const documentsQuery = overrideDocumentsQuery ?? internalDocumentsQuery;

  const { uploadMutation, retryExtractMutation, retryAllFailedMutation, removeDocumentMutation } =
    useDocumentsPanelMutations({
      token,
      selectedFile,
      setSelectedDocumentId,
      setActiveStage,
      setStatus,
      setError,
      setRecoverySummary,
      setLastRecoveredDocumentId,
    });

  return {
    selectedFile,
    setSelectedFile,
    selectedDocumentId,
    setSelectedDocumentId,
    activeStage,
    error,
    status,
    recoverySummary,
    lastRecoveredDocumentId,
    documentsQuery,
    uploadHealthQuery,
    documentEventsQuery,
    uploadMutation,
    retryExtractMutation,
    retryAllFailedMutation,
    removeDocumentMutation,
  };
};

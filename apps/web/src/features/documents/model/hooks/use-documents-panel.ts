'use client';

import { useState } from 'react';

import { useDocumentsPanelMutations } from '@/features/documents/model/hooks/use-documents-panel-mutations';
import { useDocumentsPanelQueries } from '@/features/documents/model/hooks/use-documents-panel-queries';

type UseDocumentsPanelArgs = {
  token: string;
};

export const useDocumentsPanel = ({ token }: UseDocumentsPanelArgs) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<'idle' | 'create-url' | 'upload' | 'confirm' | 'extract'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { documentsQuery, uploadHealthQuery, documentEventsQuery } = useDocumentsPanelQueries(token, selectedDocumentId);

  const { uploadMutation, retryExtractMutation, removeDocumentMutation } = useDocumentsPanelMutations({
    token,
    selectedFile,
    setSelectedDocumentId,
    setActiveStage,
    setStatus,
    setError,
  });

  return {
    selectedFile,
    setSelectedFile,
    selectedDocumentId,
    setSelectedDocumentId,
    activeStage,
    error,
    status,
    documentsQuery,
    uploadHealthQuery,
    documentEventsQuery,
    uploadMutation,
    retryExtractMutation,
    removeDocumentMutation,
  };
};


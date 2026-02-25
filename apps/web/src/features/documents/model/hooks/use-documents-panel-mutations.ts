'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  confirmDocumentUpload,
  createUploadUrl,
  extractDocument,
  removeDocument,
  uploadFileToSignedUrl,
} from '@/features/documents/api/documents-api';
import { detectDocumentType } from '@/features/documents/model/utils/detect-document-type';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { toastError, toastSuccess } from '@/shared/lib/ui/toast';

type UseDocumentsPanelMutationsArgs = {
  token: string;
  selectedFile: File | null;
  setSelectedDocumentId: (value: string | null) => void;
  setActiveStage: (value: 'idle' | 'create-url' | 'upload' | 'confirm' | 'extract') => void;
  setStatus: (value: string | null) => void;
  setError: (value: string | null) => void;
};

export const useDocumentsPanelMutations = ({
  token,
  selectedFile,
  setSelectedDocumentId,
  setActiveStage,
  setStatus,
  setError,
}: UseDocumentsPanelMutationsArgs) => {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Select a file first');
      }

      setActiveStage('create-url');
      const uploadData = await createUploadUrl(token, {
        type: detectDocumentType(selectedFile.name),
        originalName: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
      });

      setSelectedDocumentId(uploadData.document.id);
      setActiveStage('upload');
      await uploadFileToSignedUrl(uploadData.uploadUrl, selectedFile);
      setActiveStage('confirm');
      await confirmDocumentUpload(token, uploadData.document.id);
      return uploadData.document.id;
    },
    onSuccess: async (documentId) => {
      setError(null);
      setStatus('Uploaded and confirmed. Extracting text...');
      setActiveStage('extract');
      await extractDocument(token, documentId);
      setStatus('Extraction completed.');
      setActiveStage('idle');
      await invalidateQueryKeys(queryClient, [
        ['documents', token],
        ['documents', 'events', token, documentId],
      ]);
      toastSuccess('Document uploaded and extracted');
    },
    onError: (error: unknown) => {
      const message = toUserErrorMessage(error, 'Document upload failed');
      setError(message);
      setActiveStage('idle');
      setStatus(null);
      toastError(message);
    },
  });

  const retryExtractMutation = useMutation({
    mutationFn: (documentId: string) => extractDocument(token, documentId),
    onSuccess: async (_value, documentId) => {
      await invalidateQueryKeys(queryClient, [
        ['documents', token],
        ['documents', 'events', token, documentId],
      ]);
      toastSuccess('Extraction retried');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to retry extraction'));
    },
  });

  const removeDocumentMutation = useMutation({
    mutationFn: (documentId: string) => removeDocument(token, documentId),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [['documents', token]]);
      setSelectedDocumentId(null);
      toastSuccess('Document removed');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to remove document'));
    },
  });

  return {
    uploadMutation,
    retryExtractMutation,
    removeDocumentMutation,
  };
};


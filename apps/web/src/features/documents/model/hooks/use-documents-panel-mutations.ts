'use client';

import { useMutation } from '@tanstack/react-query';

import {
  confirmDocumentUpload,
  createUploadUrl,
  extractDocument,
  removeDocument,
  retryDocumentExtraction,
  retryFailedDocumentExtractions,
  uploadFileToSignedUrl,
} from '@/features/documents/api/documents-api';
import { detectDocumentType } from '@/features/documents/model/utils/detect-document-type';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastError, toastSuccess } from '@/shared/lib/ui/toast';

type UseDocumentsPanelMutationsArgs = {
  token: string;
  selectedFile: File | null;
  setSelectedDocumentId: (value: string | null) => void;
  setActiveStage: (value: 'idle' | 'create-url' | 'upload' | 'confirm' | 'extract') => void;
  setStatus: (value: string | null) => void;
  setError: (value: string | null) => void;
  setRecoverySummary: (value: string | null) => void;
};

export const useDocumentsPanelMutations = ({
  token,
  selectedFile,
  setSelectedDocumentId,
  setActiveStage,
  setStatus,
  setError,
  setRecoverySummary,
}: UseDocumentsPanelMutationsArgs) => {
  const { syncDocuments } = useDataSync(token);
  const resolveMimeType = (file: File) => {
    if (file.type) {
      return file.type;
    }
    return file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Select a file first');
      }

      setActiveStage('create-url');
      const mimeType = resolveMimeType(selectedFile);
      const uploadData = await createUploadUrl(token, {
        type: detectDocumentType(selectedFile.name),
        originalName: selectedFile.name,
        mimeType,
        size: selectedFile.size,
      });

      setSelectedDocumentId(uploadData.document.id);
      setRecoverySummary(null);
      setActiveStage('upload');
      await uploadFileToSignedUrl(uploadData.uploadUrl, selectedFile, mimeType);
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
      setRecoverySummary(null);
      setActiveStage('idle');
      syncDocuments();
      toastSuccess('Document uploaded and extracted');
    },
    onError: (error: unknown) => {
      const message = toUserErrorMessage(error, 'Document upload failed');
      setError(message);
      setActiveStage('idle');
      setStatus(null);
      setRecoverySummary(null);
      toastError(message);
    },
  });

  const retryExtractMutation = useMutation({
    mutationFn: (documentId: string) => retryDocumentExtraction(token, documentId),
    onSuccess: (result) => {
      syncDocuments();
      setStatus(result.retry.message);
      setRecoverySummary(result.retry.message);
      setSelectedDocumentId(result.document.id);
      toastSuccess('Extraction retried');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to retry extraction'));
    },
  });

  const retryAllFailedMutation = useMutation({
    mutationFn: () => retryFailedDocumentExtractions(token),
    onSuccess: (result) => {
      syncDocuments();
      setRecoverySummary(result.message);
      toastSuccess(result.message);
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to retry failed documents'));
    },
  });

  const removeDocumentMutation = useMutation({
    mutationFn: (documentId: string) => removeDocument(token, documentId),
    onSuccess: () => {
      syncDocuments();
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
    retryAllFailedMutation,
    removeDocumentMutation,
  };
};

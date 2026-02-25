import { apiRequest } from '@/shared/lib/http/api-client';

import type { DocumentDto, DocumentEventDto, DocumentUploadHealthDto } from '@/shared/types/api';

type CreateUploadUrlPayload = {
  type: 'CV' | 'LINKEDIN' | 'OTHER';
  originalName: string;
  mimeType: string;
  size: number;
};

type CreateUploadUrlResponse = {
  document: DocumentDto;
  uploadUrl: string;
};

export const createUploadUrl = (token: string, payload: CreateUploadUrlPayload) =>
  apiRequest<CreateUploadUrlResponse>('/documents/upload-url', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const confirmDocumentUpload = (token: string, documentId: string) =>
  apiRequest<DocumentDto>('/documents/confirm', {
    method: 'POST',
    token,
    body: JSON.stringify({ documentId }),
  });

export const extractDocument = (token: string, documentId: string) =>
  apiRequest<DocumentDto>('/documents/extract', {
    method: 'POST',
    token,
    body: JSON.stringify({ documentId }),
  });

export const listDocuments = (token: string) =>
  apiRequest<DocumentDto[]>('/documents', {
    method: 'GET',
    token,
  });

export const listDocumentEvents = (token: string, documentId: string) =>
  apiRequest<DocumentEventDto[]>(`/documents/${documentId}/events`, {
    method: 'GET',
    token,
  });

export const getDocumentUploadHealth = (token: string) =>
  apiRequest<DocumentUploadHealthDto>('/documents/upload-health', {
    method: 'GET',
    token,
  });

export const removeDocument = (token: string, documentId: string) =>
  apiRequest<{ ok: boolean }>(`/documents/${documentId}`, {
    method: 'DELETE',
    token,
  });

export const uploadFileToSignedUrl = async (uploadUrl: string, file: File) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error('Signed upload failed');
  }
};

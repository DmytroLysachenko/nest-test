'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  confirmDocumentUpload,
  createUploadUrl,
  extractDocument,
  getDocumentUploadHealth,
  listDocumentEvents,
  listDocuments,
  uploadFileToSignedUrl,
} from '@/features/documents/api/documents-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type DocumentsPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

const detectDocumentType = (fileName: string): 'CV' | 'LINKEDIN' | 'OTHER' => {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('linkedin')) {
    return 'LINKEDIN';
  }
  if (normalized.includes('cv') || normalized.includes('resume')) {
    return 'CV';
  }
  return 'OTHER';
};

export const DocumentsPanel = ({ token, disabled = false, disabledReason }: DocumentsPanelProps) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<'idle' | 'create-url' | 'upload' | 'confirm' | 'extract'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents', token],
    queryFn: () => listDocuments(token),
  });

  const uploadHealthQuery = useQuery({
    queryKey: ['documents', 'upload-health', token],
    queryFn: () => getDocumentUploadHealth(token),
  });

  const documentEventsQuery = useQuery({
    queryKey: ['documents', 'events', token, selectedDocumentId],
    queryFn: () => listDocumentEvents(token, selectedDocumentId as string),
    enabled: Boolean(selectedDocumentId),
  });

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
      await queryClient.invalidateQueries({ queryKey: ['documents', token] });
      await queryClient.invalidateQueries({ queryKey: ['documents', 'events', token, documentId] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.traceId ? `${err.message} (traceId: ${err.traceId})` : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Document upload failed');
      }
      setActiveStage('idle');
      setStatus(null);
    },
  });

  return (
    <Card title="Documents" description="Upload PDF documents, confirm upload, and extract text.">
      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          disabled={disabled}
          className="rounded-md border border-slate-300 p-2 text-sm"
        />
        <Button
          onClick={() => uploadMutation.mutate()}
          disabled={disabled || uploadMutation.isPending || !selectedFile}
        >
          {uploadMutation.isPending ? 'Processing...' : 'Upload + confirm + extract'}
        </Button>
        {activeStage !== 'idle' ? <p className="text-sm text-slate-600">Current stage: {activeStage}</p> : null}
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {uploadHealthQuery.data ? (
          <div className={`rounded-md border p-2 text-xs ${uploadHealthQuery.data.ok ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
            <p className="font-semibold">Upload health: {uploadHealthQuery.data.ok ? 'OK' : 'Degraded'}</p>
            <p>Bucket: {uploadHealthQuery.data.bucket.ok ? 'ok' : `error (${uploadHealthQuery.data.bucket.reason ?? 'unknown'})`}</p>
            <p>Signed URL: {uploadHealthQuery.data.signedUrl.ok ? 'ok' : `error (${uploadHealthQuery.data.signedUrl.reason ?? 'unknown'})`}</p>
            <p>TraceId: {uploadHealthQuery.data.traceId}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Document list</p>
        {documentsQuery.data?.length ? (
          documentsQuery.data.map((document) => (
            <article key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{document.originalName}</p>
              <p className="text-slate-600">
                Type: {document.type} | Extraction: {document.extractionStatus}
              </p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedDocumentId(document.id)}
                >
                  View diagnostics
                </Button>
              </div>
              {document.extractionError ? <p className="text-rose-600">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No documents yet.</p>
        )}
      </div>

      {selectedDocumentId && documentEventsQuery.data?.length ? (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Diagnostics timeline ({selectedDocumentId.slice(0, 8)})</p>
          {documentEventsQuery.data.map((event) => (
            <article key={event.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
              <p className="font-medium text-slate-900">
                {event.stage} · {event.status}
              </p>
              <p className="text-slate-700">{event.message}</p>
              {event.errorCode ? <p className="text-rose-600">code: {event.errorCode}</p> : null}
              {event.traceId ? <p className="text-slate-500">traceId: {event.traceId}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  confirmDocumentUpload,
  createUploadUrl,
  extractDocument,
  listDocuments,
  uploadFileToSignedUrl,
} from '@/features/documents/api/documents-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type DocumentsPanelProps = {
  token: string;
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

export const DocumentsPanel = ({ token }: DocumentsPanelProps) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents', token],
    queryFn: () => listDocuments(token),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Select a file first');
      }

      const uploadData = await createUploadUrl(token, {
        type: detectDocumentType(selectedFile.name),
        originalName: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
      });

      await uploadFileToSignedUrl(uploadData.uploadUrl, selectedFile);
      await confirmDocumentUpload(token, uploadData.document.id);
      return uploadData.document.id;
    },
    onSuccess: async (documentId) => {
      setError(null);
      setStatus('Uploaded and confirmed. Extracting text...');
      await extractDocument(token, documentId);
      setStatus('Extraction completed.');
      await queryClient.invalidateQueries({ queryKey: ['documents', token] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Document upload failed');
      }
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
          className="rounded-md border border-slate-300 p-2 text-sm"
        />
        <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !selectedFile}>
          {uploadMutation.isPending ? 'Processing...' : 'Upload + confirm + extract'}
        </Button>
        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
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
              {document.extractionError ? <p className="text-rose-600">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No documents yet.</p>
        )}
      </div>
    </Card>
  );
};

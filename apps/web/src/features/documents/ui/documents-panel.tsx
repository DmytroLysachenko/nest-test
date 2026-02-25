'use client';

import { useDocumentsPanel } from '@/features/documents/model/hooks/use-documents-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type DocumentsPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const DocumentsPanel = ({ token, disabled = false, disabledReason }: DocumentsPanelProps) => {
  const {
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
  } = useDocumentsPanel({ token });

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
          <div
            className={`rounded-md border p-2 text-xs ${uploadHealthQuery.data.ok ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}
          >
            <p className="font-semibold">Upload health: {uploadHealthQuery.data.ok ? 'OK' : 'Degraded'}</p>
            <p>
              Bucket:{' '}
              {uploadHealthQuery.data.bucket.ok ? 'ok' : `error (${uploadHealthQuery.data.bucket.reason ?? 'unknown'})`}
            </p>
            <p>
              Signed URL:{' '}
              {uploadHealthQuery.data.signedUrl.ok
                ? 'ok'
                : `error (${uploadHealthQuery.data.signedUrl.reason ?? 'unknown'})`}
            </p>
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
              <p className="mt-1 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    document.extractionStatus === 'READY'
                      ? 'bg-emerald-100 text-emerald-700'
                      : document.extractionStatus === 'FAILED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {document.extractionStatus}
                </span>
              </p>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setSelectedDocumentId(document.id)}>
                    View diagnostics
                  </Button>
                  {document.extractionStatus !== 'READY' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => retryExtractMutation.mutate(document.id)}
                      disabled={retryExtractMutation.isPending}
                    >
                      Retry extract
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeDocumentMutation.mutate(document.id)}
                    disabled={removeDocumentMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
                {retryExtractMutation.isPending ? (
                  <p className="mt-1 text-xs text-slate-500">Re-extracting document text...</p>
                ) : null}
                {removeDocumentMutation.isPending ? (
                  <p className="mt-1 text-xs text-slate-500">Removing document...</p>
                ) : null}
                {document.extractionStatus === 'FAILED' ? (
                  <p className="mt-1 text-xs text-amber-700">Extraction failed. Use retry or replace document.</p>
                ) : null}
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
          <p className="text-sm font-semibold text-slate-800">
            Diagnostics timeline ({selectedDocumentId.slice(0, 8)})
          </p>
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

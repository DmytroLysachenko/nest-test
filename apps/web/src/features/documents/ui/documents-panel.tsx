'use client';

import { useDocumentsPanel } from '@/features/documents/model/hooks/use-documents-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type DocumentsPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
  documentsQuery?: any;
};

export const DocumentsPanel = ({
  token,
  disabled = false,
  disabledReason,
  documentsQuery: overrideDocumentsQuery,
}: DocumentsPanelProps) => {
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
  } = useDocumentsPanel({ token, overrideDocumentsQuery });

  return (
    <Card title="Documents" description="Upload PDF documents, confirm upload, and extract text.">
      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          disabled={disabled}
          className="border-border rounded-md border p-2 text-sm"
        />
        <Button
          onClick={() => uploadMutation.mutate()}
          disabled={disabled || uploadMutation.isPending || !selectedFile}
        >
          {uploadMutation.isPending ? 'Processing...' : 'Upload + confirm + extract'}
        </Button>
        {activeStage !== 'idle' ? <p className="text-text-soft text-sm">Current stage: {activeStage}</p> : null}
        {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : null}
        {status ? <p className="text-app-success text-sm">{status}</p> : null}
        {error ? <p className="text-app-danger text-sm">{error}</p> : null}
        {uploadHealthQuery.data ? (
          <div
            className={`rounded-md border p-2 text-xs ${uploadHealthQuery.data.ok ? 'border-app-success-border bg-app-success-soft' : 'border-app-warning-border bg-app-warning-soft'}`}
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
        <p className="text-text-strong text-sm font-semibold">Document list</p>
        {documentsQuery.data?.length ? (
          documentsQuery.data.map((document) => (
            <article key={document.id} className="border-border bg-surface-muted rounded-md border p-3 text-sm">
              <p className="text-text-strong font-medium">{document.originalName}</p>
              <p className="text-text-soft">
                Type: {document.type} | Extraction: {document.extractionStatus}
              </p>
              <p className="mt-1 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    document.extractionStatus === 'READY'
                      ? 'bg-app-success-soft text-app-success'
                      : document.extractionStatus === 'FAILED'
                        ? 'bg-app-danger-soft text-app-danger'
                        : 'bg-app-warning-soft text-app-warning'
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
                  <p className="text-text-soft mt-1 text-xs">Re-extracting document text...</p>
                ) : null}
                {removeDocumentMutation.isPending ? (
                  <p className="text-text-soft mt-1 text-xs">Removing document...</p>
                ) : null}
                {document.extractionStatus === 'FAILED' ? (
                  <p className="text-app-warning mt-1 text-xs">Extraction failed. Use retry or replace document.</p>
                ) : null}
              </div>
              {document.extractionError ? <p className="text-app-danger">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-text-soft text-sm">No documents yet.</p>
        )}
      </div>

      {selectedDocumentId && documentEventsQuery.data?.length ? (
        <div className="mt-5 space-y-2">
          <p className="text-text-strong text-sm font-semibold">
            Diagnostics timeline ({selectedDocumentId.slice(0, 8)})
          </p>
          {documentEventsQuery.data.map((event) => (
            <article key={event.id} className="border-border bg-surface-elevated rounded-md border p-2 text-xs">
              <p className="text-text-strong font-medium">
                {event.stage} · {event.status}
              </p>
              <p className="text-text-soft">{event.message}</p>
              {event.errorCode ? <p className="text-app-danger">code: {event.errorCode}</p> : null}
              {event.traceId ? <p className="text-text-soft">traceId: {event.traceId}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
};

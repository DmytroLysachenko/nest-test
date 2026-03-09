'use client';

import { FileX } from 'lucide-react';

import { useDocumentsPanel } from '@/features/documents/model/hooks/use-documents-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

type DocumentsPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    retryAllFailedMutation,
    removeDocumentMutation,
  } = useDocumentsPanel({ token, overrideDocumentsQuery });
  const failedDocuments = (documentsQuery.data ?? []).filter(
    (document: { extractionStatus?: string }) => document.extractionStatus === 'FAILED',
  );

  return (
    <Card title="Documents" description="Upload PDF documents, confirm upload, and extract text.">
      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          disabled={disabled}
          className="border-border/80 bg-surface-muted/50 text-text-soft file:text-primary file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer rounded-2xl border p-2 text-sm file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
            className={`rounded-2xl border p-3 text-xs ${uploadHealthQuery.data.ok ? 'border-app-success-border bg-app-success-soft' : 'border-app-warning-border bg-app-warning-soft'}`}
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
        {failedDocuments.length > 0 ? (
          <div className="border-app-warning-border bg-app-warning-soft rounded-2xl border p-3 text-xs">
            <p className="font-semibold">Recovery actions available</p>
            <p className="mt-1">{failedDocuments.length} document(s) failed extraction and can be retried in batch.</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 h-8"
              onClick={() => retryAllFailedMutation.mutate()}
              disabled={retryAllFailedMutation.isPending}
            >
              {retryAllFailedMutation.isPending ? 'Retrying failed documents...' : 'Retry all failed extractions'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-text-strong text-sm font-semibold">Document list</p>
        {documentsQuery.data?.length ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          documentsQuery.data.map((document: any) => (
            <article key={document.id} className="app-muted-panel space-y-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-text-strong font-medium">{document.originalName}</p>
                  <p className="text-text-soft mt-1">
                    Type: {document.type} | Extraction: {document.extractionStatus}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                    document.extractionStatus === 'READY'
                      ? 'border-app-success-border bg-app-success-soft text-app-success'
                      : document.extractionStatus === 'FAILED'
                        ? 'border-app-danger-border bg-app-danger-soft text-app-danger'
                        : 'border-app-warning-border bg-app-warning-soft text-app-warning'
                  }`}
                >
                  {document.extractionStatus}
                </span>
              </div>
              <div>
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
                  <p className="text-text-soft mt-2 text-xs">Re-extracting document text...</p>
                ) : null}
                {removeDocumentMutation.isPending ? (
                  <p className="text-text-soft mt-2 text-xs">Removing document...</p>
                ) : null}
                {document.extractionStatus === 'FAILED' ? (
                  <p className="text-app-warning mt-2 text-xs">
                    Extraction failed. Retry here or replace the document before profile generation.
                  </p>
                ) : null}
              </div>
              {document.extractionError ? <p className="text-app-danger">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <EmptyState
            icon={<FileX className="h-8 w-8" />}
            title="No documents yet"
            description="Upload your CV or LinkedIn export to ground the AI generation."
          />
        )}
      </div>

      {selectedDocumentId && documentEventsQuery.data?.length ? (
        <div className="mt-6 space-y-3">
          <p className="text-text-strong text-sm font-semibold">
            Diagnostics timeline ({selectedDocumentId.slice(0, 8)})
          </p>
          <div className="space-y-2">
            {documentEventsQuery.data.map((event) => (
              <article key={event.id} className="app-muted-panel space-y-1 text-xs">
                <p className="text-text-strong font-medium">
                  {event.stage} · {event.status}
                </p>
                <p className="text-text-soft">{event.message}</p>
                {event.errorCode ? <p className="text-app-danger mt-1">code: {event.errorCode}</p> : null}
                {event.traceId ? <p className="text-text-soft mt-1">traceId: {event.traceId}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
};

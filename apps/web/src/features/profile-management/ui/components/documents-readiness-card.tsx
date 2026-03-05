'use client';

import { Card } from '@/shared/ui/card';

import type { DocumentDto } from '@/shared/types/api';

type DocumentsReadinessCardProps = {
  documents: DocumentDto[];
};

export const DocumentsReadinessCard = ({ documents }: DocumentsReadinessCardProps) => {
  const uploadedCount = documents.length;
  const readyCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const failedCount = documents.filter((document) => document.extractionStatus === 'FAILED').length;

  return (
    <Card
      title="Documents Readiness"
      description="Profile generation requires at least one extracted (READY) document."
    >
      <div className="text-text-soft space-y-2 text-sm">
        <p>Uploaded: {uploadedCount}</p>
        <p>Extracted READY: {readyCount}</p>
        <p>Extraction FAILED: {failedCount}</p>
      </div>

      <div className="mt-4 space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <article key={document.id} className="border-border bg-surface-muted rounded-md border p-3 text-sm">
              <p className="text-text-strong font-medium">{document.originalName}</p>
              <p className="text-text-soft">
                Type: {document.type} | Extraction: {document.extractionStatus}
              </p>
              {document.extractionError ? <p className="text-app-danger">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-text-soft text-sm">No documents uploaded yet.</p>
        )}
      </div>
    </Card>
  );
};

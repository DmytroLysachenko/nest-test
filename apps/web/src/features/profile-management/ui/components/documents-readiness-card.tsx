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
      <div className="space-y-2 text-sm text-slate-700">
        <p>Uploaded: {uploadedCount}</p>
        <p>Extracted READY: {readyCount}</p>
        <p>Extraction FAILED: {failedCount}</p>
      </div>

      <div className="mt-4 space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <article key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{document.originalName}</p>
              <p className="text-slate-600">
                Type: {document.type} | Extraction: {document.extractionStatus}
              </p>
              {document.extractionError ? <p className="text-rose-600">{document.extractionError}</p> : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        )}
      </div>
    </Card>
  );
};

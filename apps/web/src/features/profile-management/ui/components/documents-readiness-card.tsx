'use client';

import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

import type { DocumentDto } from '@/shared/types/api';

type DocumentsReadinessCardProps = {
  documents: DocumentDto[];
};

export const DocumentsReadinessCard = ({ documents }: DocumentsReadinessCardProps) => {
  const uploadedCount = documents.length;
  const readyCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const failedCount = documents.filter((document) => document.extractionStatus === 'FAILED').length;
  const inProgressCount = documents.filter((document) => document.extractionStatus === 'PENDING').length;

  return (
    <Card title="Documents" description="Profile generation works best once at least one document is ready to use.">
      <div className="text-text-soft space-y-2 text-sm">
        <p>Uploaded: {uploadedCount}</p>
        <p>Ready to use: {readyCount}</p>
        <p>Still processing: {inProgressCount}</p>
        <p>Need attention: {failedCount}</p>
      </div>

      <div className="mt-4 space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <article key={document.id} className="border-border bg-surface-muted rounded-md border p-3 text-sm">
              <p className="text-text-strong font-medium">{document.originalName}</p>
              <p className="text-text-soft">
                Type: {document.type} | Status:{' '}
                {document.extractionStatus === 'READY'
                  ? 'Ready to use'
                  : document.extractionStatus === 'FAILED'
                    ? 'Needs attention'
                    : 'Still processing'}
              </p>
              {document.extractionError ? (
                <WorkflowInlineNotice
                  title="Document issue"
                  description={document.extractionError}
                  tone="danger"
                  className="mt-3 px-3 py-2"
                />
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState
            title="No documents uploaded yet"
            description="Upload at least one document so profile generation has grounded experience and skills to work from."
          />
        )}
      </div>
    </Card>
  );
};

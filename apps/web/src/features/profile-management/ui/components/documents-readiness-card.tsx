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
      <div className="app-tonal-section grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Uploaded</p>
          <p className="text-text-strong mt-2 text-2xl font-semibold">{uploadedCount}</p>
        </div>
        <div>
          <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Ready to use</p>
          <p className="text-text-strong mt-2 text-2xl font-semibold">{readyCount}</p>
          <p className="text-text-soft mt-1 text-xs">
            {inProgressCount} processing, {failedCount} need attention
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <article key={document.id} className="app-open-section border-border/45 border-t pt-3 text-sm">
              <p className="text-text-strong font-medium">{document.originalName}</p>
              <p className="text-text-soft mt-1">
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

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentsPanel } from '@/features/documents/ui/documents-panel';
import { useDocumentsPanel } from '@/features/documents/model/hooks/use-documents-panel';

vi.mock('@/features/documents/model/hooks/use-documents-panel', () => ({
  useDocumentsPanel: vi.fn(),
}));

const mockedUseDocumentsPanel = vi.mocked(useDocumentsPanel);

const createDocumentsPanelState = () => ({
  selectedFile: null,
  setSelectedFile: vi.fn(),
  selectedDocumentId: null,
  setSelectedDocumentId: vi.fn(),
  activeStage: 'idle',
  error: null,
  status: null,
  recoverySummary: null,
  lastRecoveredDocumentId: null,
  documentsQuery: {
    data: [
      {
        id: 'doc-1',
        originalName: 'resume.pdf',
        type: 'CV',
        extractionStatus: 'FAILED',
        extractionError: 'Could not read file',
      },
    ],
  },
  uploadHealthQuery: {
    data: {
      ok: true,
      bucket: { ok: true, reason: null },
      signedUrl: { ok: true, reason: null },
      traceId: 'trace-1',
    },
  },
  documentEventsQuery: {
    data: [
      {
        id: 'event-1',
        stage: 'EXTRACTION',
        status: 'ERROR',
        message: 'Could not read file',
        errorCode: 'PARSE_FAILED',
        traceId: 'trace-1',
      },
    ],
  },
  uploadMutation: { mutate: vi.fn(), isPending: false, reset: vi.fn() },
  retryExtractMutation: { mutate: vi.fn(), isPending: false, variables: null },
  retryAllFailedMutation: { mutate: vi.fn(), isPending: false },
  removeDocumentMutation: { mutate: vi.fn(), isPending: false, variables: null },
});

describe('DocumentsPanel', () => {
  it('hides technical diagnostics on the normal user surface', () => {
    mockedUseDocumentsPanel.mockReturnValue(createDocumentsPanelState() as never);

    render(<DocumentsPanel token="token" />);

    expect(screen.queryByText(/Upload health:/)).not.toBeInTheDocument();
    expect(screen.queryByText('View diagnostics')).not.toBeInTheDocument();
    expect(screen.queryByText(/Diagnostics timeline/)).not.toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });

  it('shows technical diagnostics only when explicitly enabled', () => {
    mockedUseDocumentsPanel.mockReturnValue(createDocumentsPanelState() as never);

    render(<DocumentsPanel token="token" showTechnicalDetails />);

    expect(screen.getByText(/Upload health:/)).toBeInTheDocument();
    expect(screen.getByText('View diagnostics')).toBeInTheDocument();
  });
});

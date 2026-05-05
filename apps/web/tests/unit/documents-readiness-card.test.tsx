import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocumentsReadinessCard } from '@/features/profile-management/ui/components/documents-readiness-card';

describe('DocumentsReadinessCard', () => {
  it('shows summarized readiness counts in the flatter top section', () => {
    render(
      <DocumentsReadinessCard
        documents={
          [
            {
              id: 'doc-1',
              originalName: 'resume.pdf',
              type: 'CV',
              extractionStatus: 'READY',
              extractionError: null,
            },
            {
              id: 'doc-2',
              originalName: 'cover-letter.pdf',
              type: 'COVER_LETTER',
              extractionStatus: 'PENDING',
              extractionError: null,
            },
            {
              id: 'doc-3',
              originalName: 'portfolio.pdf',
              type: 'PORTFOLIO',
              extractionStatus: 'FAILED',
              extractionError: 'Parsing failed',
            },
          ] as never
        }
      />,
    );

    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    expect(screen.getByText('Ready to use')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 processing, 1 need attention')).toBeInTheDocument();
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('portfolio.pdf')).toBeInTheDocument();
  });

  it('shows the upload empty state when there are no documents yet', () => {
    render(<DocumentsReadinessCard documents={[]} />);

    expect(screen.getByText('No documents uploaded yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload at least one document so profile generation has grounded experience and skills to work from.',
      ),
    ).toBeInTheDocument();
  });
});

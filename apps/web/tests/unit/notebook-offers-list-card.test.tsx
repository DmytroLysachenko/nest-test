import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NotebookOffersListCard } from '@/features/job-offers/ui/components/notebook-offers-list-card';
import type { JobOfferListItemDto } from '@/shared/types/api';

const baseOffer: JobOfferListItemDto = {
  id: 'offer-1',
  jobOfferId: 'job-1',
  sourceRunId: 'run-12345678',
  status: 'NEW',
  matchScore: 0.91,
  rankingScore: 0.88,
  explanationTags: ['backend', 'remote'],
  followUpState: 'none',
  matchMeta: {},
  aiFeedbackScore: null,
  aiFeedbackNotes: null,
  pipelineMeta: null,
  prepMaterials: null,
  notes: null,
  tags: null,
  statusHistory: null,
  lastStatusAt: null,
  source: 'PRACUJ_PL',
  url: 'https://example.com/job',
  title: 'Senior Backend Engineer',
  company: 'Example',
  location: 'Remote',
  salary: null,
  employmentType: null,
  description: 'Role description',
  requirements: null,
  details: null,
  createdAt: '2026-03-20T10:00:00.000Z',
};

describe('NotebookOffersListCard', () => {
  it('keeps the bulk follow-up editor hidden until the user asks for it', async () => {
    const user = userEvent.setup();

    render(
      <NotebookOffersListCard
        offers={[baseOffer]}
        hiddenByModeCount={0}
        degradedResultCount={0}
        lastScrapeStatus="COMPLETED"
        selectedId={null}
        selectedOfferIds={['offer-1']}
        isBusy={false}
        offset={0}
        canPrev={false}
        canNext={false}
        isAllVisibleSelected={false}
        mode="strict"
        onSelectOffer={vi.fn()}
        onToggleOfferSelection={vi.fn()}
        onSelectAllVisible={vi.fn()}
        onClearSelected={vi.fn()}
        onBulkStatusChange={vi.fn()}
        onBulkFollowUpSave={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPlanning={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Bulk follow-up date')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit bulk plan' }));

    expect(screen.getByLabelText('Bulk follow-up date')).toBeInTheDocument();
    expect(screen.getByText(/Bulk actions are ready/i)).toBeInTheDocument();
  });

  it('renders the intentional hidden-by-mode guidance when no offers are visible', () => {
    render(
      <NotebookOffersListCard
        offers={[]}
        hiddenByModeCount={2}
        degradedResultCount={0}
        lastScrapeStatus="COMPLETED"
        selectedId={null}
        selectedOfferIds={[]}
        isBusy={false}
        offset={0}
        canPrev={false}
        canNext={false}
        isAllVisibleSelected={false}
        mode="strict"
        onSelectOffer={vi.fn()}
        onToggleOfferSelection={vi.fn()}
        onSelectAllVisible={vi.fn()}
        onClearSelected={vi.fn()}
        onBulkStatusChange={vi.fn()}
        onBulkFollowUpSave={vi.fn()}
        onModeChange={vi.fn()}
        onOpenPlanning={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Strong leads exist, but strict mode is hiding them')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to approx' })).toBeInTheDocument();
  });
});

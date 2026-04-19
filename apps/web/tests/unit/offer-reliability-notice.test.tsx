import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OfferReliabilityNotice } from '@/features/job-offers/ui/components/offer-reliability-notice';

describe('OfferReliabilityNotice', () => {
  it('does not render healthy source context', () => {
    const { container } = render(
      <OfferReliabilityNotice
        reliabilityContext={{
          key: 'healthy',
          label: 'Source data looks usable',
          description: 'No scrape reliability warning is attached to this offer.',
          severity: 'info',
          reasons: [],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders recovered scrape context as user-facing guidance', () => {
    render(
      <OfferReliabilityNotice
        reliabilityContext={{
          key: 'recovered_stale_run',
          label: 'Recovered scrape output',
          description: 'The worker missed terminal completion, but already persisted offers were recovered.',
          severity: 'warning',
          reasons: ['recovered-from-stale-run'],
        }}
      />,
    );

    expect(screen.getByText('Recovered scrape output')).toBeInTheDocument();
    expect(screen.getByText(/already persisted offers were recovered/i)).toBeInTheDocument();
  });
});

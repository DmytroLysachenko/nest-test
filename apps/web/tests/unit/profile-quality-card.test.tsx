import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfileQualityCard } from '@/features/profile-management/ui/components/profile-quality-card';

describe('ProfileQualityCard', () => {
  it('renders humanized labels instead of raw backend keys', () => {
    render(
      <ProfileQualityCard
        quality={{
          score: 84,
          signals: [
            { key: 'target_roles', status: 'ok', score: 1, message: 'Sufficient evidence present' },
            {
              key: 'keywords_coverage',
              status: 'weak',
              score: 0.6,
              message: 'Important search terms are still sparse',
            },
          ],
          missing: ['core_competencies'],
          recommendations: ['Add more technologies and concrete outcomes.'],
        }}
      />,
    );

    expect(screen.getByText('Target roles')).toBeInTheDocument();
    expect(screen.getByText('Keyword coverage')).toBeInTheDocument();
    expect(screen.getByText(/Core competencies/)).toBeInTheDocument();
    expect(screen.queryByText('target_roles')).not.toBeInTheDocument();
    expect(screen.queryByText('keywords_coverage')).not.toBeInTheDocument();
  });

  it('shows compact health summary counts and recommendations', () => {
    render(
      <ProfileQualityCard
        quality={{
          score: 90,
          signals: [
            { key: 'target_roles', status: 'ok', score: 1, message: 'Strong' },
            { key: 'technologies_coverage', status: 'weak', score: 0.7, message: 'Needs more detail' },
            { key: 'core_competencies', status: 'missing', score: 0, message: 'Missing' },
          ],
          missing: ['core_competencies'],
          recommendations: ['Add core achievements.'],
        }}
      />,
    );

    expect(screen.getByText('Strong signals')).toBeInTheDocument();
    expect(screen.getByText('Needs strengthening')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Add core achievements.')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';

import {
  getProfileQualitySignalLabel,
  getProfileQualityStatusLabel,
  presentProfileQualityMissing,
  presentProfileQualitySignals,
} from '@/features/profile-management/model/profile-quality-presenter';

describe('profile-quality-presenter', () => {
  it('maps known backend signal keys to user-facing labels', () => {
    expect(getProfileQualitySignalLabel('target_roles')).toBe('Target roles');
    expect(getProfileQualitySignalLabel('core_competencies')).toBe('Core competencies');
    expect(getProfileQualitySignalLabel('keywords_coverage')).toBe('Keyword coverage');
  });

  it('falls back to title-cased labels for unknown keys', () => {
    expect(getProfileQualitySignalLabel('seniority_alignment')).toBe('Seniority Alignment');
  });

  it('presents signal and blocker collections with human-readable labels', () => {
    expect(
      presentProfileQualitySignals([
        {
          key: 'technologies_coverage',
          status: 'weak',
          score: 0.7,
          message: 'Signal is present but under-detailed',
        },
      ]),
    ).toEqual([
      {
        key: 'technologies_coverage',
        label: 'Technology coverage',
        status: 'weak',
        statusLabel: 'Could be stronger',
        message: 'Signal is present but under-detailed',
      },
    ]);

    expect(presentProfileQualityMissing(['target_roles', 'keywords_coverage'])).toEqual([
      'Target roles',
      'Keyword coverage',
    ]);
  });

  it('maps profile quality statuses to user-facing wording', () => {
    expect(getProfileQualityStatusLabel('ok')).toBe('Strong');
    expect(getProfileQualityStatusLabel('weak')).toBe('Could be stronger');
    expect(getProfileQualityStatusLabel('missing')).toBe('Missing');
  });
});

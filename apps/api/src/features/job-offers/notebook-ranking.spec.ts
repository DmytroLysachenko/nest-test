import { computeNotebookOfferRanking } from './notebook-ranking';

describe('computeNotebookOfferRanking', () => {
  it('filters out unscored offers in strict mode', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: null,
        matchMeta: null,
      },
      'strict',
    );

    expect(result.include).toBe(false);
  });

  it('filters out hard-constraint violations in strict mode', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: 80,
        matchMeta: {
          hardConstraintViolations: ['seniority'],
        },
      },
      'strict',
    );

    expect(result.include).toBe(false);
    expect(result.explanationTags).toContain('seniority_mismatch');
  });

  it('keeps offers in approx mode and applies penalty for violations', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: 70,
        matchMeta: {
          hardConstraintViolations: ['employmentType'],
        },
      },
      'approx',
    );

    expect(result.include).toBe(true);
    expect(result.rankingScore).toBeLessThanOrEqual(70);
    expect(result.explanationTags).toContain('contract_gap');
  });
});

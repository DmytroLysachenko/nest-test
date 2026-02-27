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

  it('supports configurable approx penalties and bonuses', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: 50,
        matchMeta: {
          hardConstraintViolations: ['employmentType', 'location'],
        },
      },
      'approx',
      {
        approxViolationPenalty: 5,
        approxMaxViolationPenalty: 50,
        approxScoredBonus: 20,
      },
    );

    expect(result.include).toBe(true);
    expect(result.rankingScore).toBe(60);
  });

  it('supports configurable unscored explore base score', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: null,
        matchMeta: null,
      },
      'explore',
      {
        exploreUnscoredBase: 25,
        exploreRecencyWeight: 7,
      },
    );

    expect(result.include).toBe(true);
    expect(result.rankingScore).toBe(25);
  });

  it('caps approx violation penalty using max cap', () => {
    const result = computeNotebookOfferRanking(
      {
        matchScore: 50,
        matchMeta: {
          hardConstraintViolations: ['a', 'b', 'c', 'd'],
        },
      },
      'approx',
      {
        approxViolationPenalty: 10,
        approxMaxViolationPenalty: 15,
        approxScoredBonus: 10,
      },
    );

    expect(result.include).toBe(true);
    expect(result.rankingScore).toBe(45);
  });
});

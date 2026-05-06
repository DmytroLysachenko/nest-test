import { buildJobOfferExpiryCoverageSummary, type JobOfferExpiryCoverageRow } from './job-offers-expiry-coverage';

describe('buildJobOfferExpiryCoverageSummary', () => {
  it('builds totals and sorts source rows', () => {
    const rows: JobOfferExpiryCoverageRow[] = [
      {
        source: 'B',
        total: 5,
        withExpiry: 3,
        activeWithoutExpiry: 2,
        expired: 1,
      },
      {
        source: 'A',
        total: 10,
        withExpiry: 8,
        activeWithoutExpiry: 2,
        expired: 4,
      },
    ];

    const summary = buildJobOfferExpiryCoverageSummary(rows);

    expect(summary.items.map((item) => item.source)).toEqual(['A', 'B']);
    expect(summary.items[0]).toMatchObject({
      source: 'A',
      coverageRate: 0.8,
      activeWithoutExpiryRate: 0.2,
      expiredRate: 0.4,
    });
    expect(summary.items[1]).toMatchObject({
      source: 'B',
      coverageRate: 0.6,
      activeWithoutExpiryRate: 0.4,
      expiredRate: 0.2,
    });
    expect(summary.totals).toMatchObject({
      source: 'ALL',
      total: 15,
      withExpiry: 11,
      activeWithoutExpiry: 4,
      expired: 5,
      coverageRate: 0.7333,
      activeWithoutExpiryRate: 0.2667,
      expiredRate: 0.3333,
    });
  });

  it('returns zero rates when totals are empty', () => {
    const summary = buildJobOfferExpiryCoverageSummary([]);

    expect(summary.items).toEqual([]);
    expect(summary.totals).toEqual({
      source: 'ALL',
      total: 0,
      withExpiry: 0,
      activeWithoutExpiry: 0,
      expired: 0,
      coverageRate: 0,
      activeWithoutExpiryRate: 0,
      expiredRate: 0,
    });
  });

  it('rounds rates to four decimals', () => {
    const summary = buildJobOfferExpiryCoverageSummary([
      {
        source: 'P',
        total: 3,
        withExpiry: 2,
        activeWithoutExpiry: 1,
        expired: 1,
      },
    ]);

    expect(summary.items[0]).toMatchObject({
      coverageRate: 0.6667,
      activeWithoutExpiryRate: 0.3333,
      expiredRate: 0.3333,
    });
  });
});

export type JobOfferExpiryCoverageRow = {
  source: string;
  total: number;
  withExpiry: number;
  activeWithoutExpiry: number;
  expired: number;
};

export type JobOfferExpiryCoverageItem = JobOfferExpiryCoverageRow & {
  coverageRate: number;
  activeWithoutExpiryRate: number;
  expiredRate: number;
};

export type JobOfferExpiryCoverageSummary = {
  totals: JobOfferExpiryCoverageItem;
  items: JobOfferExpiryCoverageItem[];
};

const toRate = (value: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Number((value / total).toFixed(4));
};

const toCoverageItem = (row: JobOfferExpiryCoverageRow): JobOfferExpiryCoverageItem => ({
  ...row,
  coverageRate: toRate(row.withExpiry, row.total),
  activeWithoutExpiryRate: toRate(row.activeWithoutExpiry, row.total),
  expiredRate: toRate(row.expired, row.total),
});

export function buildJobOfferExpiryCoverageSummary(rows: JobOfferExpiryCoverageRow[]): JobOfferExpiryCoverageSummary {
  const items = rows.map((row) => toCoverageItem(row)).sort((left, right) => left.source.localeCompare(right.source));

  const totals = items.reduce<JobOfferExpiryCoverageRow>(
    (acc, item) => ({
      source: 'ALL',
      total: acc.total + item.total,
      withExpiry: acc.withExpiry + item.withExpiry,
      activeWithoutExpiry: acc.activeWithoutExpiry + item.activeWithoutExpiry,
      expired: acc.expired + item.expired,
    }),
    {
      source: 'ALL',
      total: 0,
      withExpiry: 0,
      activeWithoutExpiry: 0,
      expired: 0,
    },
  );

  return {
    totals: toCoverageItem(totals),
    items,
  };
}

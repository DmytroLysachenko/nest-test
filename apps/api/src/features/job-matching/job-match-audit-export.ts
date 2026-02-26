type JobMatchAuditItem = {
  id: string;
  careerProfileId: string;
  profileVersion: number;
  score: number;
  minScore: number | null;
  isMatch: boolean;
  jobDescription: string;
  matchMeta: unknown;
  createdAt: Date;
};

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildJobMatchAuditCsv(items: JobMatchAuditItem[]): string {
  const header = [
    'id',
    'careerProfileId',
    'profileVersion',
    'score',
    'minScore',
    'isMatch',
    'jobDescription',
    'matchMeta',
    'createdAt',
  ];

  const rows = items.map((item) =>
    [
      toCsvValue(item.id),
      toCsvValue(item.careerProfileId),
      toCsvValue(item.profileVersion),
      toCsvValue(item.score),
      toCsvValue(item.minScore),
      toCsvValue(item.isMatch),
      toCsvValue(item.jobDescription),
      toCsvValue(item.matchMeta),
      toCsvValue(item.createdAt.toISOString()),
    ].join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

import { buildJobMatchAuditCsv } from './job-match-audit-export';

describe('buildJobMatchAuditCsv', () => {
  it('serializes audit rows with escaped fields', () => {
    const csv = buildJobMatchAuditCsv([
      {
        id: 'm-1',
        careerProfileId: 'cp-1',
        profileVersion: 2,
        score: 81,
        minScore: 70,
        isMatch: true,
        jobDescription: 'Senior "Frontend" role',
        matchMeta: { breakdown: { competency: 40 }, tags: ['strict'] },
        createdAt: new Date('2026-02-26T10:00:00.000Z'),
      },
    ]);

    expect(csv).toContain(
      'id,careerProfileId,profileVersion,score,minScore,isMatch,jobDescription,matchMeta,createdAt',
    );
    expect(csv).toContain('"Senior ""Frontend"" role"');
    expect(csv).toContain('"2026-02-26T10:00:00.000Z"');
    expect(csv).toContain('"{"');
  });
});

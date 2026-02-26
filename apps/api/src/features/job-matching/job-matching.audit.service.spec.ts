import { JobMatchingService } from './job-matching.service';

describe('JobMatchingService listMatchAudit', () => {
  it('returns persisted audit rows with pagination metadata', async () => {
    const items = [
      {
        id: 'm-1',
        careerProfileId: 'cp-1',
        profileVersion: 1,
        score: 77,
        minScore: 60,
        isMatch: true,
        jobDescription: 'Frontend role',
        matchMeta: { engine: 'deterministic-profile-v1' },
        createdAt: new Date('2026-02-26T12:00:00.000Z'),
      },
    ];

    let selectCall = 0;
    const db = {
      select: jest.fn().mockImplementation(() => {
        const currentCall = selectCall++;
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockImplementation(() => {
              if (currentCall === 0) {
                return {
                  orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      offset: jest.fn().mockResolvedValue(items),
                    }),
                  }),
                };
              }

              return Promise.resolve([{ total: 1 }]);
            }),
          }),
        };
      }),
    } as any;

    const service = new JobMatchingService(db);
    const result = await service.listMatchAudit('user-1', {
      limit: '10',
      offset: '0',
    } as any);

    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.matchMeta).toEqual({ engine: 'deterministic-profile-v1' });
  });
});

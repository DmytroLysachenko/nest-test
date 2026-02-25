import { onboardingDraftsTable } from '@repo/db';

import { OnboardingDraftsService } from './onboarding-drafts.service';

describe('OnboardingDraftsService', () => {
  it('creates draft when none exists', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockImplementation((table) => {
        if (table !== onboardingDraftsTable) {
          throw new Error('unexpected table');
        }
        return {
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'draft-1', payload: { a: 1 } }]),
          }),
        };
      }),
    } as any;

    const service = new OnboardingDraftsService(db);
    const result = await service.upsert('user-1', { a: 1 });

    expect(result?.id).toBe('draft-1');
  });

  it('updates existing draft', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'draft-1', userId: 'user-1', payload: { old: 1 } }]),
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'draft-1', payload: { next: true } }]),
          }),
        }),
      }),
    } as any;

    const service = new OnboardingDraftsService(db);
    const result = await service.upsert('user-1', { next: true });

    expect(result?.payload).toEqual({ next: true });
  });
});

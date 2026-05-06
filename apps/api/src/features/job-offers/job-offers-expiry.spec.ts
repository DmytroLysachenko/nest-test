import { jobOffersTable } from '@repo/db';

import { reconcileExpiredJobOffers } from './job-offers-expiry';

describe('reconcileExpiredJobOffers', () => {
  it('marks past-due offers expired and returns affected count', async () => {
    const returning = jest.fn().mockResolvedValue([{ id: 'offer-1' }, { id: 'offer-2' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const db = { update } as any;
    const now = new Date('2026-05-06T10:00:00.000Z');

    const count = await reconcileExpiredJobOffers(db, now);

    expect(count).toBe(2);
    expect(update).toHaveBeenCalledWith(jobOffersTable);
    expect(set).toHaveBeenCalledWith({ isExpired: true });
    expect(where).toHaveBeenCalledTimes(1);
    expect(returning).toHaveBeenCalledWith({ id: jobOffersTable.id });
  });

  it('returns zero when nothing crossed expiry boundary', async () => {
    const returning = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const db = { update } as any;

    const count = await reconcileExpiredJobOffers(db);

    expect(count).toBe(0);
  });
});

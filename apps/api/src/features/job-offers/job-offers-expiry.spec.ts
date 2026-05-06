import { PgDialect } from 'drizzle-orm/pg-core';
import { jobOffersTable } from '@repo/db';

import {
  buildExpiredJobOffersWhere,
  reconcileExpiredJobOffers,
  DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS,
} from './job-offers-expiry';

describe('reconcileExpiredJobOffers', () => {
  it('marks past-due offers expired and returns affected count', async () => {
    const returning = jest.fn().mockResolvedValue([{ id: 'offer-1' }, { id: 'offer-2' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const db = { update } as any;
    const now = new Date('2026-05-06T10:00:00.000Z');

    const count = await reconcileExpiredJobOffers(db, { now });

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

  it('expires null-expiry offers once they stay unseen beyond the stale cutoff', () => {
    const dialect = new PgDialect();
    const now = new Date('2026-05-06T10:00:00.000Z');
    const where = buildExpiredJobOffersWhere({
      now,
      nullExpiryStaleHours: 48,
    });

    const query = dialect.sqlToQuery(where as any);

    expect(query.sql).toContain('"job_offers"."expires_at"');
    expect(query.sql).toContain('"job_offers"."last_seen_at"');
  });

  it('uses the documented default stale window for null-expiry offers', () => {
    expect(DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS).toBe(336);
  });
});

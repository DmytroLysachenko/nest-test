import { PgDialect } from 'drizzle-orm/pg-core';

import {
  buildExpiredJobOffersWhere,
  DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS,
  getJobOfferExpiryReconcileOptions,
} from './job-offers-expiry';

describe('job offer expiry reconcile options', () => {
  it('reads the configured null-expiry stale window from config', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JOB_OFFERS_NULL_EXPIRY_STALE_HOURS') {
          return 72;
        }
        return undefined;
      }),
    } as any;
    const now = new Date('2026-05-06T10:00:00.000Z');

    const options = getJobOfferExpiryReconcileOptions(configService, now);

    expect(options).toEqual({
      now,
      nullExpiryStaleHours: 72,
    });
  });

  it('falls back to the documented default stale window when config is unset', () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as any;

    const options = getJobOfferExpiryReconcileOptions(configService);

    expect(options.nullExpiryStaleHours).toBe(DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS);
  });

  it('builds a predicate that covers explicit expiry and stale null-expiry rows together', () => {
    const dialect = new PgDialect();
    const where = buildExpiredJobOffersWhere({
      now: new Date('2026-05-06T10:00:00.000Z'),
      nullExpiryStaleHours: 24,
    });

    const query = dialect.sqlToQuery(where as any);

    expect(query.sql).toContain('"job_offers"."is_expired" = $1');
    expect(query.sql).toContain('"job_offers"."expires_at" is not null');
    expect(query.sql).toContain('"job_offers"."expires_at" < $2');
    expect(query.sql).toContain('"job_offers"."expires_at" is null');
    expect(query.sql).toContain('"job_offers"."last_seen_at" < $3');
  });

  it('keeps explicit expiry and stale-null-expiry branches under the same active-only guard', () => {
    const dialect = new PgDialect();
    const where = buildExpiredJobOffersWhere({
      now: new Date('2026-05-06T10:00:00.000Z'),
      nullExpiryStaleHours: 168,
    });

    const query = dialect.sqlToQuery(where as any);
    const activeGuardCount = query.sql.split('"job_offers"."is_expired" = $1').length - 1;

    expect(activeGuardCount).toBe(1);
  });
});

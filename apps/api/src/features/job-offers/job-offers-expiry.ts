import { ConfigService } from '@nestjs/config';
import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { jobOffersTable } from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { Env } from '@/config/env';

export const DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS = 14 * 24;

export type ReconcileExpiredJobOffersOptions = {
  now?: Date;
  nullExpiryStaleHours?: number;
};

export const getJobOfferExpiryReconcileOptions = (
  configService: ConfigService<Env, true>,
  now?: Date,
): ReconcileExpiredJobOffersOptions => ({
  now,
  nullExpiryStaleHours:
    configService.get('JOB_OFFERS_NULL_EXPIRY_STALE_HOURS', { infer: true }) ??
    DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS,
});

export const buildExpiredJobOffersWhere = (options: ReconcileExpiredJobOffersOptions = {}) => {
  const now = options.now ?? new Date();
  const nullExpiryStaleHours = options.nullExpiryStaleHours ?? DEFAULT_JOB_OFFERS_NULL_EXPIRY_STALE_HOURS;
  const staleNullExpiryCutoff = new Date(now.getTime() - nullExpiryStaleHours * 60 * 60 * 1000);

  return and(
    eq(jobOffersTable.isExpired, false),
    or(
      and(isNotNull(jobOffersTable.expiresAt), lt(jobOffersTable.expiresAt, now)),
      and(isNull(jobOffersTable.expiresAt), lt(jobOffersTable.lastSeenAt, staleNullExpiryCutoff)),
    ),
  );
};

export async function reconcileExpiredJobOffers(
  db: NodePgDatabase,
  options: ReconcileExpiredJobOffersOptions = {},
): Promise<number> {
  const rows = await db
    .update(jobOffersTable)
    .set({
      isExpired: true,
    })
    .where(buildExpiredJobOffersWhere(options))
    .returning({ id: jobOffersTable.id });

  return rows.length;
}

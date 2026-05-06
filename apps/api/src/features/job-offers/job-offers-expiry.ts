import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { jobOffersTable } from '@repo/db';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export async function reconcileExpiredJobOffers(db: NodePgDatabase, now = new Date()): Promise<number> {
  const rows = await db
    .update(jobOffersTable)
    .set({
      isExpired: true,
    })
    .where(
      and(eq(jobOffersTable.isExpired, false), isNotNull(jobOffersTable.expiresAt), lt(jobOffersTable.expiresAt, now)),
    )
    .returning({ id: jobOffersTable.id });

  return rows.length;
}

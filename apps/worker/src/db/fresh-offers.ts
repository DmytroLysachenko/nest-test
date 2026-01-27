import { and, desc, eq, gte, inArray } from 'drizzle-orm';

import { jobOffersTable } from '@repo/db';

import { getDb } from './client';

const chunk = <T>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

export const loadFreshOfferUrls = async (
  databaseUrl: string | undefined,
  source: 'PRACUJ_PL',
  urls: string[],
  hours: number,
) => {
  const db = getDb(databaseUrl);
  if (!db || urls.length === 0) {
    return new Set<string>();
  }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const fresh = new Set<string>();

  for (const batch of chunk(urls, 200)) {
    const rows = await db
      .select({ url: jobOffersTable.url })
      .from(jobOffersTable)
      .where(and(eq(jobOffersTable.source, source), inArray(jobOffersTable.url, batch), gte(jobOffersTable.fetchedAt, cutoff)))
      .orderBy(desc(jobOffersTable.fetchedAt));
    rows.forEach((row) => {
      if (row.url) {
        fresh.add(row.url);
      }
    });
  }

  return fresh;
};

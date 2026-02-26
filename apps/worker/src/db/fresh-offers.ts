import { and, desc, eq, gte, inArray, or } from 'drizzle-orm';

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
  const sourceIdsByUrl = new Map<string, string>();
  urls.forEach((url) => {
    const match = url.match(/,oferta,(\d+)/);
    if (match?.[1]) {
      sourceIdsByUrl.set(url, match[1]);
    }
  });

  for (const batch of chunk(urls, 200)) {
    const batchSourceIds = batch
      .map((url) => sourceIdsByUrl.get(url))
      .filter((value): value is string => Boolean(value));
    const identityConditions = [inArray(jobOffersTable.url, batch)];
    if (batchSourceIds.length) {
      identityConditions.push(inArray(jobOffersTable.sourceId, batchSourceIds));
    }
    const rows = await db
      .select({ url: jobOffersTable.url, sourceId: jobOffersTable.sourceId })
      .from(jobOffersTable)
      .where(and(eq(jobOffersTable.source, source), gte(jobOffersTable.fetchedAt, cutoff), or(...identityConditions)))
      .orderBy(desc(jobOffersTable.fetchedAt));
    rows.forEach((row) => {
      if (row.url) {
        fresh.add(row.url);
      }
      if (row.sourceId) {
        for (const [url, sourceId] of sourceIdsByUrl.entries()) {
          if (sourceId === row.sourceId) {
            fresh.add(url);
          }
        }
      }
    });
  }

  return fresh;
};

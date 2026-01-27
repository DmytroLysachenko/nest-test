import { eq } from 'drizzle-orm';

import type { NormalizedJob } from '../sources/types';

import { getDb } from './client';
import { jobOffersTable, jobSourceRunsTable } from '@repo/db';

const mapSource = (source: string) => {
  if (source === 'pracuj-pl') {
    return 'PRACUJ_PL';
  }
  throw new Error(`Unknown source: ${source}`);
};

type PersistInput = {
  source: string;
  listingUrl: string;
  filters?: Record<string, unknown>;
  jobLinks: string[];
  jobs: NormalizedJob[];
};

export const persistScrapeResult = async (databaseUrl: string | undefined, input: PersistInput) => {
  const db = getDb(databaseUrl);
  if (!db) {
    return null;
  }

  const source = mapSource(input.source);
  const now = new Date();

  const run = await db
    .insert(jobSourceRunsTable)
    .values({
      source,
      listingUrl: input.listingUrl,
      filters: input.filters ?? null,
      status: 'RUNNING',
      totalFound: input.jobLinks.length,
      startedAt: now,
    })
    .returning({ id: jobSourceRunsTable.id });

  const runId = run[0]?.id;
  if (!runId) {
    return null;
  }

  if (input.jobs.length) {
    await db.insert(jobOffersTable).values(
      input.jobs.map((job) => ({
        source,
        sourceId: job.sourceId,
        runId,
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        employmentType: job.employmentType,
        description: job.description,
        requirements: job.requirements,
        details: job.details,
      })),
    );
  }

  await db
    .update(jobSourceRunsTable)
    .set({
      status: 'COMPLETED',
      scrapedCount: input.jobs.length,
      completedAt: new Date(),
    })
    .where(eq(jobSourceRunsTable.id, runId));

  return runId;
};

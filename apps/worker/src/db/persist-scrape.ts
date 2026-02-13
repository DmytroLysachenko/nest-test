import { and, eq, inArray, sql } from 'drizzle-orm';
import { jobOffersTable, jobSourceRunsTable } from '@repo/db';

import type { NormalizedJob } from '../sources/types';

import { getDb } from './client';

const mapSource = (source: string) => {
  if (source === 'pracuj-pl') {
    return 'PRACUJ_PL';
  }
  throw new Error(`Unknown source: ${source}`);
};

type PersistInput = {
  source: string;
  sourceRunId?: string;
  listingUrl: string;
  filters?: Record<string, unknown>;
  userId?: string;
  careerProfileId?: string;
  jobLinks: string[];
  jobs: NormalizedJob[];
};

const chunk = <T>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

type TextColumn =
  | typeof jobOffersTable.sourceId
  | typeof jobOffersTable.title
  | typeof jobOffersTable.company
  | typeof jobOffersTable.location
  | typeof jobOffersTable.salary
  | typeof jobOffersTable.employmentType
  | typeof jobOffersTable.description;

type JsonColumn = typeof jobOffersTable.requirements | typeof jobOffersTable.details;

const preferIncomingText = (column: TextColumn, placeholder?: string) =>
  sql`CASE
        WHEN excluded.${column} IS NOT NULL
         AND excluded.${column} != ''
         ${placeholder ? sql`AND excluded.${column} != ${placeholder}` : sql``}
        THEN excluded.${column}
        ELSE ${column}
      END`;

const preferIncomingJson = (column: JsonColumn) =>
  sql`CASE
        WHEN excluded.${column} IS NOT NULL THEN excluded.${column}
        ELSE ${column}
      END`;

const ensureRun = async (
  databaseUrl: string | undefined,
  input: Omit<PersistInput, 'jobs'> & { jobs?: NormalizedJob[] },
) => {
  const db = getDb(databaseUrl);
  if (!db) {
    return null;
  }

  const source = mapSource(input.source);
  const now = new Date();

  if (input.sourceRunId) {
    const updateValues: Partial<typeof jobSourceRunsTable.$inferInsert> = {
      source,
      listingUrl: input.listingUrl,
      filters: input.filters ?? null,
      status: 'RUNNING',
      startedAt: now,
      totalFound: input.jobLinks.length,
    };
    if (input.userId) {
      updateValues.userId = input.userId;
    }
    if (input.careerProfileId) {
      updateValues.careerProfileId = input.careerProfileId;
    }

    const [updated] = await db
      .update(jobSourceRunsTable)
      .set(updateValues)
      .where(eq(jobSourceRunsTable.id, input.sourceRunId))
      .returning({ id: jobSourceRunsTable.id });

    if (updated?.id) {
      return updated.id;
    }
  }

  const [created] = await db
    .insert(jobSourceRunsTable)
    .values({
      source,
      userId: input.userId,
      careerProfileId: input.careerProfileId,
      listingUrl: input.listingUrl,
      filters: input.filters ?? null,
      status: 'RUNNING',
      totalFound: input.jobLinks.length,
      startedAt: now,
    })
    .returning({ id: jobSourceRunsTable.id });

  return created?.id ?? null;
};

export const markRunRunning = async (
  databaseUrl: string | undefined,
  input: {
    source: string;
    sourceRunId?: string;
    listingUrl: string;
    filters?: Record<string, unknown>;
    userId?: string;
    careerProfileId?: string;
    jobLinks?: string[];
  },
) => {
  if (!input.sourceRunId) {
    return null;
  }

  return ensureRun(databaseUrl, {
    ...input,
    jobLinks: input.jobLinks ?? [],
    jobs: [],
  });
};

export const markRunFailed = async (
  databaseUrl: string | undefined,
  sourceRunId: string | undefined,
  error: string,
) => {
  const db = getDb(databaseUrl);
  if (!db || !sourceRunId) {
    return;
  }

  await db
    .update(jobSourceRunsTable)
    .set({
      status: 'FAILED',
      error,
      completedAt: new Date(),
    })
    .where(eq(jobSourceRunsTable.id, sourceRunId));
};

export const persistScrapeResult = async (databaseUrl: string | undefined, input: PersistInput) => {
  const db = getDb(databaseUrl);
  if (!db) {
    return null;
  }

  const runId = await ensureRun(databaseUrl, input);
  if (!runId) {
    return null;
  }

  const source = mapSource(input.source);

  if (input.jobs.length) {
    await db
      .insert(jobOffersTable)
      .values(
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
      )
      .onConflictDoUpdate({
        target: [jobOffersTable.source, jobOffersTable.url],
        set: {
          sourceId: preferIncomingText(jobOffersTable.sourceId),
          runId: sql`excluded.${jobOffersTable.runId}`,
          title: preferIncomingText(jobOffersTable.title, 'Unknown title'),
          company: preferIncomingText(jobOffersTable.company),
          location: preferIncomingText(jobOffersTable.location),
          salary: preferIncomingText(jobOffersTable.salary),
          employmentType: preferIncomingText(jobOffersTable.employmentType),
          description: preferIncomingText(jobOffersTable.description, 'No description found'),
          requirements: preferIncomingJson(jobOffersTable.requirements),
          details: preferIncomingJson(jobOffersTable.details),
          fetchedAt: new Date(),
        },
      });
  }

  if (input.jobLinks.length) {
    for (const batch of chunk(input.jobLinks, 200)) {
      await db
        .update(jobOffersTable)
        .set({ runId })
        .where(and(eq(jobOffersTable.source, source), inArray(jobOffersTable.url, batch)));
    }
  }

  await db
    .update(jobSourceRunsTable)
    .set({
      status: 'COMPLETED',
      totalFound: input.jobLinks.length,
      scrapedCount: input.jobs.length,
      error: null,
      completedAt: new Date(),
    })
    .where(eq(jobSourceRunsTable.id, runId));

  return runId;
};

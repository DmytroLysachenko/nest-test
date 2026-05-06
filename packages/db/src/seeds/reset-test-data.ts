import { config } from 'dotenv';
import { and, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  documentsTable,
  jobMatchesTable,
  jobOffersTable,
  jobSourceCallbackEventsTable,
  jobSourceRunAttemptsTable,
  jobSourceRunEventsTable,
  jobSourceRunsTable,
  notebookPreferencesTable,
  onboardingDraftsTable,
  profileInputsTable,
  scrapeExecutionEventsTable,
  scrapeScheduleEventsTable,
  scrapeSchedulesTable,
  userJobOffersTable,
  usersTable,
  workerTaskExecutionsTable,
} from '../schema';
import {
  buildResetCleanupPlan,
  buildResetCleanupPreviewSummary,
  normalizeResetCleanupOptions,
  validateResetCleanupOptions,
} from './reset-test-data-core';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
});

const db = drizzle(pool);
const options = normalizeResetCleanupOptions(process.env);

const countRows = async (query: Promise<Array<{ value: number }>>) => Number((await query)[0]?.value ?? 0);

const uniqueIds = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.filter((item): item is string => Boolean(item))));

async function resolveTargetUsers() {
  const conditions = [];
  if (options.userIds.length > 0) {
    conditions.push(inArray(usersTable.id, options.userIds));
  }
  if (options.userEmails.length > 0) {
    conditions.push(inArray(sql`lower(${usersTable.email})`, options.userEmails));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(or(...conditions));
}

async function main() {
  validateResetCleanupOptions(options);

  try {
    const targetUsers = await resolveTargetUsers();
    if (targetUsers.length === 0) {
      throw new Error('No target users matched RESET_USER_IDS / RESET_USER_EMAILS.');
    }

    const targetUserIds = targetUsers.map((user) => user.id);
    const targetRuns = await db
      .select({ id: jobSourceRunsTable.id })
      .from(jobSourceRunsTable)
      .where(inArray(jobSourceRunsTable.userId, targetUserIds));
    const targetRunIds = targetRuns.map((row) => row.id);

    const [targetLinkedOfferRows, targetRunOwnedOfferRows] = await Promise.all([
      db
        .select({ id: userJobOffersTable.jobOfferId })
        .from(userJobOffersTable)
        .where(inArray(userJobOffersTable.userId, targetUserIds)),
      targetRunIds.length > 0
        ? db.select({ id: jobOffersTable.id }).from(jobOffersTable).where(inArray(jobOffersTable.runId, targetRunIds))
        : Promise.resolve([]),
    ]);
    const targetOfferIds = uniqueIds([
      ...targetLinkedOfferRows.map((row) => row.id),
      ...targetRunOwnedOfferRows.map((row) => row.id),
    ]);

    const [protectedByOtherUsers, protectedByOtherRuns, protectedByOtherCurrentRun] = await Promise.all([
      options.scope === 'user-and-shared-offers' && targetOfferIds.length > 0
        ? db
            .select({ id: userJobOffersTable.jobOfferId })
            .from(userJobOffersTable)
            .where(
              and(
                inArray(userJobOffersTable.jobOfferId, targetOfferIds),
                notInArray(userJobOffersTable.userId, targetUserIds),
              ),
            )
        : Promise.resolve([]),
      options.scope === 'user-and-shared-offers' && targetOfferIds.length > 0
        ? db.execute(sql`
            select distinct o.job_offer_id as id
            from job_offer_source_observations o
            inner join job_source_runs r on r.id = o.run_id
            where o.job_offer_id = any(${targetOfferIds}::uuid[])
              and r.user_id <> all(${targetUserIds}::uuid[])
          `)
        : Promise.resolve({ rows: [] as Array<{ id: string }> }),
      options.scope === 'user-and-shared-offers' && targetOfferIds.length > 0
        ? db.execute(sql`
            select jo.id
            from job_offers jo
            inner join job_source_runs r on r.id = jo.run_id
            where jo.id = any(${targetOfferIds}::uuid[])
              and r.user_id <> all(${targetUserIds}::uuid[])
          `)
        : Promise.resolve({ rows: [] as Array<{ id: string }> }),
    ]);

    const protectedOfferIds = new Set(
      uniqueIds([
        ...protectedByOtherUsers.map((row) => row.id),
        ...protectedByOtherRuns.rows.map((row) => String(row.id)),
        ...protectedByOtherCurrentRun.rows.map((row) => String(row.id)),
      ]),
    );
    const deletableSharedOfferIds =
      options.scope === 'user-and-shared-offers' ? targetOfferIds.filter((id) => !protectedOfferIds.has(id)) : [];

    const preview = {
      targetUsers: targetUsers.length,
      targetRuns: targetRunIds.length,
      targetLinkedOffers: targetOfferIds.length,
      targetRunOwnedOffers: targetRunOwnedOfferRows.length,
      deletableSharedOffers: deletableSharedOfferIds.length,
      preservedSharedOffers: options.scope === 'user-and-shared-offers' ? protectedOfferIds.size : 0,
      userJobOffers: await countRows(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(userJobOffersTable)
          .where(inArray(userJobOffersTable.userId, targetUserIds)),
      ),
      jobMatches: await countRows(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(jobMatchesTable)
          .where(inArray(jobMatchesTable.userId, targetUserIds)),
      ),
      schedules: await countRows(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(scrapeSchedulesTable)
          .where(inArray(scrapeSchedulesTable.userId, targetUserIds)),
      ),
      scheduleEvents: await countRows(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(scrapeScheduleEventsTable)
          .where(inArray(scrapeScheduleEventsTable.userId, targetUserIds)),
      ),
      runEvents: targetRunIds.length
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(jobSourceRunEventsTable)
              .where(inArray(jobSourceRunEventsTable.sourceRunId, targetRunIds)),
          )
        : 0,
      runAttempts: targetRunIds.length
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(jobSourceRunAttemptsTable)
              .where(inArray(jobSourceRunAttemptsTable.sourceRunId, targetRunIds)),
          )
        : 0,
      callbackEvents: targetRunIds.length
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(jobSourceCallbackEventsTable)
              .where(inArray(jobSourceCallbackEventsTable.sourceRunId, targetRunIds)),
          )
        : 0,
      scrapeExecutionEvents: targetRunIds.length
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(scrapeExecutionEventsTable)
              .where(inArray(scrapeExecutionEventsTable.sourceRunId, targetRunIds)),
          )
        : 0,
      workerTaskExecutions: targetRunIds.length
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(workerTaskExecutionsTable)
              .where(inArray(workerTaskExecutionsTable.sourceRunId, targetRunIds)),
          )
        : 0,
      careerProfiles: options.includeProfileWorkflowData
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(profileInputsTable)
              .where(inArray(profileInputsTable.userId, targetUserIds)),
          )
        : 0,
      profileInputs: options.includeProfileWorkflowData
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(profileInputsTable)
              .where(inArray(profileInputsTable.userId, targetUserIds)),
          )
        : 0,
      notebookPreferences: options.includeProfileWorkflowData
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(notebookPreferencesTable)
              .where(inArray(notebookPreferencesTable.userId, targetUserIds)),
          )
        : 0,
      onboardingDrafts: options.includeProfileWorkflowData
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(onboardingDraftsTable)
              .where(inArray(onboardingDraftsTable.userId, targetUserIds)),
          )
        : 0,
      documents: options.includeProfileWorkflowData
        ? await countRows(
            db
              .select({ value: sql<number>`count(*)::int` })
              .from(documentsTable)
              .where(inArray(documentsTable.userId, targetUserIds)),
          )
        : 0,
    };

    const plan = buildResetCleanupPlan({
      scope: options.scope,
      includeProfileWorkflowData: options.includeProfileWorkflowData,
    });
    const summary = buildResetCleanupPreviewSummary(preview, {
      scope: options.scope,
      includeProfileWorkflowData: options.includeProfileWorkflowData,
    });

    if (!options.applyChanges) {
      console.log(
        JSON.stringify(
          {
            mode: 'preview',
            targets: targetUsers,
            options,
            plan,
            preview: summary,
          },
          null,
          2,
        ),
      );
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(userJobOffersTable).where(inArray(userJobOffersTable.userId, targetUserIds));
      await tx.delete(jobMatchesTable).where(inArray(jobMatchesTable.userId, targetUserIds));
      await tx.delete(scrapeScheduleEventsTable).where(inArray(scrapeScheduleEventsTable.userId, targetUserIds));
      await tx.delete(scrapeSchedulesTable).where(inArray(scrapeSchedulesTable.userId, targetUserIds));

      if (targetRunIds.length > 0) {
        await tx
          .delete(jobSourceCallbackEventsTable)
          .where(inArray(jobSourceCallbackEventsTable.sourceRunId, targetRunIds));
        await tx.delete(jobSourceRunAttemptsTable).where(inArray(jobSourceRunAttemptsTable.sourceRunId, targetRunIds));
        await tx
          .delete(scrapeExecutionEventsTable)
          .where(inArray(scrapeExecutionEventsTable.sourceRunId, targetRunIds));
        await tx.delete(workerTaskExecutionsTable).where(inArray(workerTaskExecutionsTable.sourceRunId, targetRunIds));
        await tx.delete(jobSourceRunEventsTable).where(inArray(jobSourceRunEventsTable.sourceRunId, targetRunIds));
      }

      await tx.delete(jobSourceRunsTable).where(inArray(jobSourceRunsTable.userId, targetUserIds));

      if (options.includeProfileWorkflowData) {
        await tx.delete(notebookPreferencesTable).where(inArray(notebookPreferencesTable.userId, targetUserIds));
        await tx.delete(onboardingDraftsTable).where(inArray(onboardingDraftsTable.userId, targetUserIds));
        await tx.delete(documentsTable).where(inArray(documentsTable.userId, targetUserIds));
        await tx.delete(profileInputsTable).where(inArray(profileInputsTable.userId, targetUserIds));
      }

      if (deletableSharedOfferIds.length > 0) {
        await tx.delete(jobOffersTable).where(inArray(jobOffersTable.id, deletableSharedOfferIds));
      }
    });

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          targets: targetUsers,
          options,
          plan,
          applied: summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Targeted reset failed:', error);
  process.exitCode = 1;
});

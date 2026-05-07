import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

import { buildResetReadinessReport, type ResetVerificationPhase } from './reset-readiness-core';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const phase = (
  (process.env.RESET_VERIFY_PHASE ?? 'pre-reset').trim().toLowerCase() === 'post-reset' ? 'post-reset' : 'pre-reset'
) as ResetVerificationPhase;
const windowHours = Math.max(1, Number(process.env.RESET_VERIFY_WINDOW_HOURS ?? 72));
const nullExpiryStaleHours = Math.max(1, Number(process.env.JOB_OFFERS_NULL_EXPIRY_STALE_HOURS ?? 336));
const minimumCategoryCoverageRate = Number(process.env.RESET_VERIFY_MIN_CATEGORY_COVERAGE ?? 0.8);
const strictMode = ['1', 'true', 'yes', 'on'].includes((process.env.RESET_VERIFY_STRICT ?? '').trim().toLowerCase());

const pool = new Pool({
  connectionString,
});

const db = drizzle(pool);

const scalar = (rows: Array<Record<string, unknown>>, key: string) => Number(rows[0]?.[key] ?? 0);
const scalarBoolean = (rows: Array<Record<string, unknown>>, key: string) => Boolean(rows[0]?.[key] ?? false);

async function main() {
  try {
    const requiredTables = [
      'job_offers',
      'user_job_offers',
      'job_source_runs',
      'job_source_run_events',
      'job_source_callback_events',
      'scrape_schedules',
      'scrape_schedule_events',
      'job_categories',
      'employment_types',
      'work_modes',
      'users',
    ];
    const staleNullExpiryInterval = `${nullExpiryStaleHours} hours`;
    const recentWindowInterval = `${windowHours} hours`;

    const [
      migrationState,
      requiredTableRows,
      adminRows,
      scheduleRows,
      userLinkRows,
      duplicateUserLinkRows,
      offerRows,
      taxonomyRows,
      recentRunRows,
      recentScheduleEventRows,
    ] = await Promise.all([
      db.execute(sql`
        select
          exists (
            select 1
            from information_schema.tables
            where table_schema = 'drizzle'
              and table_name = '__drizzle_migrations'
          ) as migrations_table_present,
          coalesce(
            (
              select count(*)::int
              from drizzle.__drizzle_migrations
            ),
            0
          ) as migration_count
      `),
      db.execute(sql`
        select
          table_name,
          to_regclass('public.' || table_name) is not null as present
        from unnest(${sql.raw(`array[${requiredTables.map((name) => `'${name}'`).join(', ')}]::text[]`)}) as table_name
      `),
      db.execute(sql`
        select
          count(*) filter (where role = 'admin' and is_active = true)::int as active_admin_users
        from users
      `),
      db.execute(sql`
        select
          count(*) filter (where enabled = 1)::int as enabled_schedules,
          count(*) filter (where enabled = 1 and last_triggered_at is null)::int as schedules_never_triggered,
          count(*) filter (
            where enabled = 1
              and last_run_status like 'ENQUEUED%'
              and updated_at < now() - interval '2 hours'
          )::int as stale_enqueued_schedules
        from scrape_schedules
      `),
      db.execute(sql`
        select
          count(*)::int as total_user_job_offers,
          count(*) filter (
            where not exists (select 1 from users u where u.id = user_job_offers.user_id)
               or not exists (select 1 from career_profiles cp where cp.id = user_job_offers.career_profile_id)
               or not exists (select 1 from job_offers jo where jo.id = user_job_offers.job_offer_id)
          )::int as orphan_user_job_offers
        from user_job_offers
      `),
      db.execute(sql`
        select
          coalesce(sum(dup_count), 0)::int as duplicate_user_job_offers
        from (
          select greatest(count(*) - 1, 0) as dup_count
          from user_job_offers
          group by user_id, career_profile_id, job_offer_id
          having count(*) > 1
        ) duplicates
      `),
      db.execute(sql`
        select
          count(*)::int as total_job_offers,
          count(*) filter (
            where is_expired = false
              and expires_at is not null
              and expires_at < now()
          )::int as active_past_expiry_offers,
          count(*) filter (
            where is_expired = false
              and expires_at is null
              and last_seen_at < now() - interval ${staleNullExpiryInterval}
          )::int as active_stale_null_expiry_offers
        from job_offers
      `),
      db.execute(sql`
        select
          count(*) filter (where source = 'PRACUJ_PL')::int as pracuj_offers,
          count(*) filter (where source = 'PRACUJ_PL' and job_category_id is null)::int as pracuj_offers_without_category,
          count(*) filter (where source = 'PRACUJ_PL' and employment_type_id is null)::int as pracuj_offers_without_employment_type,
          count(*) filter (where source = 'PRACUJ_PL' and work_mode_id is null)::int as pracuj_offers_without_work_mode
        from job_offers
      `),
      db.execute(sql`
        with scheduled_runs as (
          select distinct source_run_id
          from scrape_schedule_events
          where source_run_id is not null
            and event_type = 'schedule_enqueue_succeeded'
        )
        select
          count(*) filter (where r.id in (select source_run_id from scheduled_runs) and r.status = 'COMPLETED')::int as recent_scheduled_completed_runs,
          count(*) filter (where r.id in (select source_run_id from scheduled_runs) and r.status = 'FAILED')::int as recent_scheduled_failed_runs,
          count(*) filter (where r.id not in (select source_run_id from scheduled_runs) and r.status = 'COMPLETED')::int as recent_manual_or_direct_completed_runs,
          count(*) filter (where r.id not in (select source_run_id from scheduled_runs) and r.status = 'FAILED')::int as recent_manual_or_direct_failed_runs,
          count(*) filter (where r.status = 'FAILED' and r.classified_outcome = 'partial_success')::int as recent_recovered_failed_runs,
          count(*) filter (where r.classified_outcome = 'detail_parse_gap')::int as recent_detail_parse_gap_runs,
          count(*) filter (where r.classified_outcome = 'callback_rejected')::int as recent_callback_rejected_runs
        from job_source_runs r
        where r.created_at >= now() - interval ${recentWindowInterval}
      `),
      db.execute(sql`
        select
          count(*) filter (
            where created_at >= now() - interval ${recentWindowInterval}
              and event_type in ('schedule_run_completed', 'schedule_run_failed')
          )::int as recent_terminal_schedule_events
        from scrape_schedule_events
      `),
    ]);

    const missingRequiredTables = requiredTableRows.rows
      .filter((row) => !row.present)
      .map((row) => String(row.table_name));

    const report = buildResetReadinessReport(
      {
        migrationsTablePresent: scalarBoolean(migrationState.rows, 'migrations_table_present'),
        migrationCount: scalar(migrationState.rows, 'migration_count'),
        missingRequiredTables,
        activeAdminUsers: scalar(adminRows.rows, 'active_admin_users'),
        enabledSchedules: scalar(scheduleRows.rows, 'enabled_schedules'),
        schedulesNeverTriggered: scalar(scheduleRows.rows, 'schedules_never_triggered'),
        staleEnqueuedSchedules: scalar(scheduleRows.rows, 'stale_enqueued_schedules'),
        orphanUserJobOffers: scalar(userLinkRows.rows, 'orphan_user_job_offers'),
        duplicateUserJobOffers: scalar(duplicateUserLinkRows.rows, 'duplicate_user_job_offers'),
        totalUserJobOffers: scalar(userLinkRows.rows, 'total_user_job_offers'),
        totalJobOffers: scalar(offerRows.rows, 'total_job_offers'),
        activePastExpiryOffers: scalar(offerRows.rows, 'active_past_expiry_offers'),
        activeStaleNullExpiryOffers: scalar(offerRows.rows, 'active_stale_null_expiry_offers'),
        pracujOffers: scalar(taxonomyRows.rows, 'pracuj_offers'),
        pracujOffersWithoutCategory: scalar(taxonomyRows.rows, 'pracuj_offers_without_category'),
        pracujOffersWithoutEmploymentType: scalar(taxonomyRows.rows, 'pracuj_offers_without_employment_type'),
        pracujOffersWithoutWorkMode: scalar(taxonomyRows.rows, 'pracuj_offers_without_work_mode'),
        recentScheduledCompletedRuns: scalar(recentRunRows.rows, 'recent_scheduled_completed_runs'),
        recentScheduledFailedRuns: scalar(recentRunRows.rows, 'recent_scheduled_failed_runs'),
        recentManualOrDirectCompletedRuns: scalar(recentRunRows.rows, 'recent_manual_or_direct_completed_runs'),
        recentManualOrDirectFailedRuns: scalar(recentRunRows.rows, 'recent_manual_or_direct_failed_runs'),
        recentRecoveredFailedRuns: scalar(recentRunRows.rows, 'recent_recovered_failed_runs'),
        recentDetailParseGapRuns: scalar(recentRunRows.rows, 'recent_detail_parse_gap_runs'),
        recentCallbackRejectedRuns: scalar(recentRunRows.rows, 'recent_callback_rejected_runs'),
        recentTerminalScheduleEvents: scalar(recentScheduleEventRows.rows, 'recent_terminal_schedule_events'),
      },
      {
        phase,
        windowHours,
        nullExpiryStaleHours,
        minimumCategoryCoverageRate,
      },
    );

    console.log(JSON.stringify(report, null, 2));

    if (strictMode && report.overallStatus === 'fail') {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Reset-readiness audit failed:', error);
  process.exitCode = 1;
});

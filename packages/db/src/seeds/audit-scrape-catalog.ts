import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
});

const db = drizzle(pool);

async function main() {
  try {
    const [runFailures, scheduleFailures, categoryCoverage, redundantAliases, suspiciousContracts] = await Promise.all([
      db.execute(sql`
        select
          coalesce(failure_type, 'unknown') as failure_type,
          count(*)::int as count
        from job_source_runs
        where status = 'FAILED'
          and created_at >= now() - interval '7 days'
        group by 1
        order by count desc, failure_type asc
      `),
      db.execute(sql`
        select
          event_type,
          coalesce(code, 'n/a') as code,
          count(*)::int as count
        from scrape_schedule_events
        where created_at >= now() - interval '7 days'
          and (severity = 'error' or event_type = 'schedule_enqueue_failed')
        group by 1, 2
        order by count desc, event_type asc
      `),
      db.execute(sql`
        select
          count(*)::int as total_offers,
          count(*) filter (where job_category_id is null)::int as offers_without_category,
          count(*) filter (where employment_type_id is null)::int as offers_without_employment_type,
          count(*) filter (where source = 'PRACUJ_PL' and work_mode_id is null)::int as offers_without_work_mode
        from job_offers
        where source = 'PRACUJ_PL'
      `),
      db.execute(sql`
        select
          c.canonical_name,
          c.normalized_name,
          ca.alias,
          ca.normalized_alias,
          ca.source,
          ca.created_at
        from company_aliases ca
        inner join companies c on c.id = ca.company_id
        where ca.normalized_alias = c.normalized_name
        order by ca.created_at desc
        limit 25
      `),
      db.execute(sql`
        select
          slug,
          label,
          created_at
        from contract_types
        where slug ~ '[,;/|]'
           or label ~ '[,;/|]'
        order by created_at desc
        limit 25
      `),
    ]);

    const output = {
      generatedAt: new Date().toISOString(),
      runFailuresLast7d: runFailures.rows,
      scheduleFailuresLast7d: scheduleFailures.rows,
      categoryCoverage: categoryCoverage.rows[0] ?? null,
      redundantCompanyAliasesSample: redundantAliases.rows,
      suspiciousContractTypesSample: suspiciousContracts.rows,
    };

    console.log(JSON.stringify(output, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Scrape/catalog audit failed:', error);
  process.exitCode = 1;
});

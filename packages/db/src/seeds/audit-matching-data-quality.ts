import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
  try {
    const [offerCoverage, scoreDistribution, hardViolations, noisyTaxonomy, duplicateCandidates, staleMatches] =
      await Promise.all([
        db.execute(sql`
        select
          count(*)::int as total_offers,
          count(*) filter (where job_category_id is null)::int as missing_category,
          count(*) filter (where employment_type_id is null)::int as missing_employment_type,
          count(*) filter (where contract_type_id is null)::int as missing_contract_type,
          count(*) filter (where work_mode_id is null)::int as missing_work_mode,
          count(*) filter (where salary_min is null and salary_max is null)::int as missing_salary,
          count(*) filter (where requirements is null or requirements = '[]'::jsonb)::int as missing_requirements
        from job_offers
        where quality_state = 'ACCEPTED'
      `),
        db.execute(sql`
        select
          width_bucket(score, 0, 100, 5)::int as bucket,
          min(score)::int as min_score,
          max(score)::int as max_score,
          count(*)::int as count
        from job_matches
        group by 1
        order by 1
      `),
        db.execute(sql`
        select
          violation,
          count(*)::int as count
        from job_matches,
        lateral jsonb_array_elements_text(coalesce(match_meta->'hardConstraintViolations', '[]'::jsonb)) as violation
        group by violation
        order by count desc, violation asc
      `),
        db.execute(sql`
        select 'contract_types' as table_name, count(*)::int as noisy_count
        from contract_types
        where slug ~ '(contract-of-employment|umowa-o|praca-|ekspert)'
        union all
        select 'work_modes' as table_name, count(*)::int as noisy_count
        from work_modes
        where slug ~ '(praca-|hybrydowa|stacjonarna)'
        union all
        select 'seniority_levels' as table_name, count(*)::int as noisy_count
        from seniority_levels
        where slug ~ '(ekspert|expert)'
      `),
        db.execute(sql`
        select
          lower(title) as normalized_title,
          lower(coalesce(company, '')) as normalized_company,
          count(*)::int as count,
          count(distinct url)::int as distinct_urls,
          count(distinct content_hash)::int as distinct_content_hashes
        from job_offers
        group by 1, 2
        having count(*) > 1
        order by count desc, normalized_title asc
        limit 25
      `),
        db.execute(sql`
        select
          coalesce(match_version, 'missing') as match_version,
          count(*)::int as count
        from user_job_offers
        group by 1
        order by count desc
      `),
      ]);

    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          offerCoverage: offerCoverage.rows[0] ?? null,
          scoreDistribution: scoreDistribution.rows,
          hardViolations: hardViolations.rows,
          noisyTaxonomy: noisyTaxonomy.rows,
          duplicateCandidates: duplicateCandidates.rows,
          userOfferMatchVersions: staleMatches.rows,
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
  console.error('Matching data quality audit failed:', error);
  process.exitCode = 1;
});

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const shouldApply = ['1', 'true', 'yes', 'on'].includes((process.env.APPLY_CHANGES ?? '').trim().toLowerCase());

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const canonicalRows = {
  contractTypes: [
    ['uop', 'Employment contract'],
    ['b2b', 'B2B contract'],
    ['mandate', 'Mandate contract'],
    ['internship', 'Internship'],
  ],
  workModes: [
    ['remote', 'Remote'],
    ['hybrid', 'Hybrid'],
    ['onsite', 'On-site'],
  ],
  seniorityLevels: [['senior', 'Senior']],
} as const;

async function ensureCanonicalRows() {
  if (!shouldApply) {
    return;
  }

  for (const [slug, label] of canonicalRows.contractTypes) {
    await db.execute(sql`
      insert into contract_types (slug, label)
      values (${slug}, ${label})
      on conflict (slug) do nothing
    `);
  }
  for (const [slug, label] of canonicalRows.workModes) {
    await db.execute(sql`
      insert into work_modes (slug, label)
      values (${slug}, ${label})
      on conflict (slug) do nothing
    `);
  }
  for (const [slug, label] of canonicalRows.seniorityLevels) {
    await db.execute(sql`
      insert into seniority_levels (slug, label)
      values (${slug}, ${label})
      on conflict (slug) do nothing
    `);
  }
}

async function main() {
  try {
    const noisyRows = await Promise.all([
      db.execute(sql`
        select 'contract_types' as table_name, slug, label, count(*) over ()::int as noisy_count
        from contract_types
        where slug in (
          'contract-of-employment-b2b-contract',
          'contract-of-employment-contract-of-mandate-b2b-contract',
          'umowa-o-prace-kontrakt-b2b',
          'umowa-o-staz-praktyki'
        )
        order by slug
      `),
      db.execute(sql`
        select 'work_modes' as table_name, slug, label, count(*) over ()::int as noisy_count
        from work_modes
        where slug in ('praca-hybrydowa', 'praca-stacjonarna')
        order by slug
      `),
      db.execute(sql`
        select 'seniority_levels' as table_name, slug, label, count(*) over ()::int as noisy_count
        from seniority_levels
        where slug in ('ekspert-ekspertka', 'expert')
        order by slug
      `),
    ]);

    await ensureCanonicalRows();

    if (shouldApply) {
      await db.execute(sql`
        update job_offers
        set contract_type_id = target.id
        from contract_types source
        cross join contract_types target
        where job_offers.contract_type_id = source.id
          and target.slug = case
            when source.slug like '%b2b%' then 'b2b'
            when source.slug like '%mandate%' then 'mandate'
            when source.slug like '%staz%' or source.slug like '%praktyki%' then 'internship'
            else 'uop'
          end
          and source.slug in (
            'contract-of-employment-b2b-contract',
            'contract-of-employment-contract-of-mandate-b2b-contract',
            'umowa-o-prace-kontrakt-b2b',
            'umowa-o-staz-praktyki'
          )
      `);
      await db.execute(sql`
        update job_offers
        set work_mode_id = target.id
        from work_modes source
        cross join work_modes target
        where job_offers.work_mode_id = source.id
          and target.slug = case when source.slug = 'praca-hybrydowa' then 'hybrid' else 'onsite' end
          and source.slug in ('praca-hybrydowa', 'praca-stacjonarna')
      `);
      await db.execute(sql`
        update job_offer_seniority_levels
        set seniority_level_id = target.id
        from seniority_levels source
        cross join seniority_levels target
        where job_offer_seniority_levels.seniority_level_id = source.id
          and target.slug = 'senior'
          and source.slug in ('ekspert-ekspertka', 'expert')
      `);
    }

    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: shouldApply ? 'apply' : 'dry-run',
          noisyTaxonomyRows: noisyRows.flatMap((result) => result.rows),
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
  console.error('Taxonomy dimension repair failed:', error);
  process.exitCode = 1;
});

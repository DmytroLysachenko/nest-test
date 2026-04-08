import { config } from 'dotenv';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { backfillCatalogNormalization } from '../catalog-backfill';
import { companiesTable, companyAliasesTable } from '../schema';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const shouldApply = ['1', 'true', 'yes', 'on'].includes((process.env.APPLY_CHANGES ?? '').trim().toLowerCase());

const pool = new Pool({
  connectionString,
});

const db = drizzle(pool);

async function main() {
  try {
    const redundantAliases = await db
      .select({
        id: companyAliasesTable.id,
        companyId: companyAliasesTable.companyId,
        canonicalName: companiesTable.canonicalName,
        normalizedName: companiesTable.normalizedName,
        alias: companyAliasesTable.alias,
        normalizedAlias: companyAliasesTable.normalizedAlias,
      })
      .from(companyAliasesTable)
      .innerJoin(companiesTable, eq(companyAliasesTable.companyId, companiesTable.id))
      .where(and(sql<boolean>`${companyAliasesTable.normalizedAlias} = ${companiesTable.normalizedName}`))
      .limit(500);

    const backfillStats = await backfillCatalogNormalization(db, {
      batchSize: Number(process.env.CATALOG_BACKFILL_BATCH_SIZE ?? 250),
    });

    let prunedRedundantAliases = 0;
    if (shouldApply && redundantAliases.length > 0) {
      for (const alias of redundantAliases) {
        await db.delete(companyAliasesTable).where(eq(companyAliasesTable.id, alias.id));
        prunedRedundantAliases += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: shouldApply ? 'apply' : 'report-only',
          backfillStats,
          redundantAliasesFound: redundantAliases.length,
          prunedRedundantAliases,
          redundantAliasSample: redundantAliases.slice(0, 25),
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
  console.error('Scrape/catalog repair failed:', error);
  process.exitCode = 1;
});

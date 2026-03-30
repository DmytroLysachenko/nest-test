import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { Pool } from 'pg';

import { backfillCatalogNormalization } from '../catalog-backfill';

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
    const stats = await backfillCatalogNormalization(db, {
      batchSize: Number(process.env.CATALOG_BACKFILL_BATCH_SIZE ?? 250),
    });

    console.log('Catalog normalization backfill completed.');
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Catalog normalization backfill failed:', error);
  process.exitCode = 1;
});

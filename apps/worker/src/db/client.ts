import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let pool: Pool | null = null;

export const getDb = (databaseUrl?: string) => {
  if (!databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl });
  }
  return drizzle(pool);
};

// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_LOCAL ??
  process.env.DATABASE_URL_NEON;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL (or DATABASE_URL_LOCAL / DATABASE_URL_NEON) must be set for Drizzle config',
  );
}

export default defineConfig({
  schema: './src/database/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});

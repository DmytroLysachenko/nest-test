// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema', // folder with .ts table definitions
  out: './drizzle', // migrations output folder
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // e.g. postgres://user:pass@host:5432/db
  },
});

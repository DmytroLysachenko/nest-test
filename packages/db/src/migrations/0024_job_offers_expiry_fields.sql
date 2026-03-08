ALTER TABLE "job_offers" ADD COLUMN IF NOT EXISTS "is_expired" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN IF NOT EXISTS "last_full_scrape_at" timestamp with time zone;

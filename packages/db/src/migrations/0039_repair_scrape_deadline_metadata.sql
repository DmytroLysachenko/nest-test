ALTER TABLE "scrape_execution_events"
ADD COLUMN IF NOT EXISTS "task_id" varchar(128);

ALTER TABLE "scrape_execution_events"
ADD COLUMN IF NOT EXISTS "dedupe_key" varchar(128);

ALTER TABLE "scrape_execution_events"
ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp with time zone;

ALTER TABLE "scrape_execution_events"
ADD COLUMN IF NOT EXISTS "execution_status" varchar(32);

CREATE INDEX IF NOT EXISTS "scrape_execution_events_task_created_at_idx"
ON "scrape_execution_events" ("task_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "scrape_execution_events_execution_status_created_at_idx"
ON "scrape_execution_events" ("execution_status", "created_at" DESC);

ALTER TABLE "job_source_runs"
ADD COLUMN IF NOT EXISTS "canonical_listing_url" text;

CREATE INDEX IF NOT EXISTS "job_source_runs_canonical_listing_url_idx"
ON "job_source_runs" ("canonical_listing_url");

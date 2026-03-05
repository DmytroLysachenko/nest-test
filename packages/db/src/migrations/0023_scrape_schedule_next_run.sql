ALTER TABLE "scrape_schedules"
ADD COLUMN "next_run_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "scrape_schedules"
ADD COLUMN "last_run_status" varchar(32);
--> statement-breakpoint
UPDATE "scrape_schedules"
SET "next_run_at" = now()
WHERE "next_run_at" IS NULL;

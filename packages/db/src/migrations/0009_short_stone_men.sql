ALTER TABLE "user_job_offers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "status_history" jsonb;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "last_status_at" timestamp with time zone DEFAULT now();
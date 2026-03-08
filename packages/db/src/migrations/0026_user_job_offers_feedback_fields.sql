ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "ai_feedback_score" integer;
--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "ai_feedback_notes" text;
--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "pipeline_meta" jsonb;
--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "prep_materials" jsonb;

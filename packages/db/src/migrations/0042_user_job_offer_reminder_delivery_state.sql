ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_window_key" text;
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_bucket" text;
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_delivery_status" text;
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_sent_at" timestamp with time zone;
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_attempted_at" timestamp with time zone;
ALTER TABLE "user_job_offers" ADD COLUMN IF NOT EXISTS "reminder_last_error" text;

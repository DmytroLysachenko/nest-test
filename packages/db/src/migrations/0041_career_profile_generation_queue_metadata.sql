ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "generation_queued_at" timestamp with time zone;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "generation_started_at" timestamp with time zone;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "generation_lease_expires_at" timestamp with time zone;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "generation_attempt_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "generation_last_trace_id" text;

UPDATE "career_profiles"
SET "generation_queued_at" = COALESCE("generation_queued_at", "created_at")
WHERE "status" = 'PENDING';

CREATE INDEX IF NOT EXISTS "career_profiles_generation_queue_idx"
  ON "career_profiles" ("status", "generation_lease_expires_at", "created_at")
  WHERE "status" = 'PENDING';

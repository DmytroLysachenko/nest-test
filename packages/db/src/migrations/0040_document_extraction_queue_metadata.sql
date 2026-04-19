ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_queued_at" timestamp with time zone;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_started_at" timestamp with time zone;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_lease_expires_at" timestamp with time zone;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_attempt_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_last_trace_id" text;

UPDATE "documents"
SET "extraction_queued_at" = COALESCE("extraction_queued_at", "created_at")
WHERE "extraction_status" = 'PENDING'
  AND "uploaded_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "documents_extraction_queue_idx"
  ON "documents" ("extraction_status", "extraction_lease_expires_at", "uploaded_at")
  WHERE "extraction_status" = 'PENDING';

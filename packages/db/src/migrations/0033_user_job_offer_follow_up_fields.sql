ALTER TABLE "user_job_offers"
ADD COLUMN "follow_up_at" timestamp with time zone,
ADD COLUMN "next_step" text,
ADD COLUMN "follow_up_note" text,
ADD COLUMN "application_url" text,
ADD COLUMN "contact_name" text,
ADD COLUMN "last_follow_up_completed_at" timestamp with time zone,
ADD COLUMN "last_follow_up_snoozed_at" timestamp with time zone;

UPDATE "user_job_offers"
SET
  "follow_up_at" = CASE
    WHEN jsonb_typeof("pipeline_meta"->'followUpAt') = 'string'
      AND nullif(trim("pipeline_meta"->>'followUpAt'), '') IS NOT NULL
    THEN ("pipeline_meta"->>'followUpAt')::timestamp with time zone
    ELSE NULL
  END,
  "next_step" = nullif(trim("pipeline_meta"->>'nextStep'), ''),
  "follow_up_note" = nullif(trim("pipeline_meta"->>'followUpNote'), ''),
  "application_url" = nullif(trim("pipeline_meta"->>'applicationUrl'), ''),
  "contact_name" = nullif(trim("pipeline_meta"->>'contactName'), ''),
  "last_follow_up_completed_at" = CASE
    WHEN jsonb_typeof("pipeline_meta"->'lastFollowUpCompletedAt') = 'string'
      AND nullif(trim("pipeline_meta"->>'lastFollowUpCompletedAt'), '') IS NOT NULL
    THEN ("pipeline_meta"->>'lastFollowUpCompletedAt')::timestamp with time zone
    ELSE NULL
  END,
  "last_follow_up_snoozed_at" = CASE
    WHEN jsonb_typeof("pipeline_meta"->'lastFollowUpSnoozedAt') = 'string'
      AND nullif(trim("pipeline_meta"->>'lastFollowUpSnoozedAt'), '') IS NOT NULL
    THEN ("pipeline_meta"->>'lastFollowUpSnoozedAt')::timestamp with time zone
    ELSE NULL
  END
WHERE "pipeline_meta" IS NOT NULL;

CREATE INDEX "user_job_offers_user_follow_up_at_idx" ON "user_job_offers" ("user_id","follow_up_at" DESC);

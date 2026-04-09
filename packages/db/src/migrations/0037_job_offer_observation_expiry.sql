ALTER TABLE "job_offer_source_observations"
ADD COLUMN "is_expired" boolean DEFAULT false NOT NULL;

ALTER TABLE "job_offer_source_observations"
ADD COLUMN "expires_at" timestamp with time zone;

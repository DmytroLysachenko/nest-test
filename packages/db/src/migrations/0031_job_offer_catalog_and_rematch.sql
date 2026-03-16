CREATE TYPE "public"."job_offer_quality_state" AS ENUM('ACCEPTED', 'REJECTED', 'REVIEW');
--> statement-breakpoint
CREATE TYPE "public"."user_job_offer_origin" AS ENUM('SCRAPE', 'DB_REUSE', 'CATALOG_REMATCH');
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "content_hash" text;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "quality_state" "job_offer_quality_state" DEFAULT 'ACCEPTED' NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "quality_reason" text;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "last_matched_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "origin" "user_job_offer_origin" DEFAULT 'SCRAPE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "match_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
UPDATE "job_offers"
SET
  "first_seen_at" = COALESCE("fetched_at", now()),
  "last_seen_at" = COALESCE("fetched_at", now());
--> statement-breakpoint
CREATE INDEX "job_offers_source_quality_last_seen_idx" ON "job_offers" USING btree ("source","quality_state","last_seen_at" DESC NULLS LAST);

CREATE TYPE "public"."job_source" AS ENUM('PRACUJ_PL');--> statement-breakpoint
CREATE TYPE "public"."job_source_run_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "job_source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "job_source" NOT NULL,
	"listing_url" text NOT NULL,
	"filters" jsonb,
	"status" "job_source_run_status" DEFAULT 'PENDING' NOT NULL,
	"total_found" integer,
	"scraped_count" integer,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "job_source" NOT NULL,
	"source_id" text,
	"run_id" uuid,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"location" text,
	"salary" text,
	"employment_type" text,
	"description" text NOT NULL,
	"requirements" jsonb,
	"details" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_run_id_job_source_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE set null ON UPDATE no action;
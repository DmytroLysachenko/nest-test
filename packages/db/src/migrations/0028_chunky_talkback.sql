ALTER TYPE "public"."job_offer_status" ADD VALUE 'INTERVIEWING' BEFORE 'DISMISSED';--> statement-breakpoint
ALTER TYPE "public"."job_offer_status" ADD VALUE 'OFFER' BEFORE 'DISMISSED';--> statement-breakpoint
ALTER TYPE "public"."job_offer_status" ADD VALUE 'REJECTED' BEFORE 'DISMISSED';--> statement-breakpoint
ALTER TYPE "public"."job_offer_status" ADD VALUE 'ARCHIVED' BEFORE 'DISMISSED';--> statement-breakpoint
CREATE TABLE "api_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"request_id" varchar(128),
	"level" varchar(16) NOT NULL,
	"method" varchar(16) NOT NULL,
	"path" text NOT NULL,
	"status_code" integer NOT NULL,
	"message" text NOT NULL,
	"error_code" varchar(128),
	"details" text[],
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notebook_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filters" jsonb NOT NULL,
	"saved_preset" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_source_run_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"attempt_no" integer NOT NULL,
	"queue_task_name" text,
	"queue_provider" varchar(32),
	"status" varchar(32) NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_type" varchar(32),
	"failure_code" varchar(128),
	"error" text,
	"payload_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"enabled" integer DEFAULT 0 NOT NULL,
	"cron" varchar(128) DEFAULT '0 9 * * *' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Europe/Warsaw' NOT NULL,
	"source" varchar(32) DEFAULT 'pracuj-pl-it' NOT NULL,
	"limit" integer DEFAULT 20 NOT NULL,
	"career_profile_id" uuid,
	"filters" jsonb,
	"last_triggered_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"last_run_status" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "last_heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "progress" jsonb;--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "attempt_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "payload_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "emitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "offer_identity_key" text;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "is_expired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "last_full_scrape_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "ai_feedback_score" integer;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "ai_feedback_notes" text;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "pipeline_meta" jsonb;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD COLUMN "prep_materials" jsonb;--> statement-breakpoint
ALTER TABLE "api_request_events" ADD CONSTRAINT "api_request_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_preferences" ADD CONSTRAINT "notebook_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_source_run_attempts" ADD CONSTRAINT "job_source_run_attempts_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_schedules" ADD CONSTRAINT "scrape_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_request_events_request_created_at_idx" ON "api_request_events" USING btree ("request_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_request_events_user_created_at_idx" ON "api_request_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_request_events_level_created_at_idx" ON "api_request_events" USING btree ("level","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "notebook_preferences_user_uidx" ON "notebook_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notebook_preferences_user_updated_at_idx" ON "notebook_preferences" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_run_attempts_run_attempt_uidx" ON "job_source_run_attempts" USING btree ("source_run_id","attempt_no");--> statement-breakpoint
CREATE INDEX "job_source_run_attempts_run_created_at_idx" ON "job_source_run_attempts" USING btree ("source_run_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "scrape_schedules_user_unique_idx" ON "scrape_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scrape_schedules_enabled_updated_idx" ON "scrape_schedules" USING btree ("enabled","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_matches_user_created_at_idx" ON "job_matches" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_matches_user_is_match_score_idx" ON "job_matches" USING btree ("user_id","is_match","score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_user_created_at_idx" ON "job_source_runs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_user_heartbeat_at_idx" ON "job_source_runs" USING btree ("user_id","last_heartbeat_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_source_status_created_at_idx" ON "job_source_runs" USING btree ("source","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "job_offers_source_identity_key_unique" ON "job_offers" USING btree ("source","offer_identity_key");--> statement-breakpoint
CREATE INDEX "job_offers_source_run_fetched_at_idx" ON "job_offers" USING btree ("source","run_id","fetched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_job_offers_user_source_run_last_status_at_idx" ON "user_job_offers" USING btree ("user_id","source_run_id","last_status_at" DESC NULLS LAST);
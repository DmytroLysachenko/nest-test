CREATE TYPE "public"."job_offer_status" AS ENUM('NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "user_job_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"career_profile_id" uuid NOT NULL,
	"job_offer_id" uuid NOT NULL,
	"source_run_id" uuid,
	"status" "job_offer_status" DEFAULT 'NEW' NOT NULL,
	"match_score" integer,
	"match_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "career_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD CONSTRAINT "user_job_offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD CONSTRAINT "user_job_offers_career_profile_id_career_profiles_id_fk" FOREIGN KEY ("career_profile_id") REFERENCES "public"."career_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD CONSTRAINT "user_job_offers_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_offers" ADD CONSTRAINT "user_job_offers_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_job_offers_unique" ON "user_job_offers" USING btree ("user_id","career_profile_id","job_offer_id");--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD CONSTRAINT "job_source_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD CONSTRAINT "job_source_runs_career_profile_id_career_profiles_id_fk" FOREIGN KEY ("career_profile_id") REFERENCES "public"."career_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_offers_source_url_unique" ON "job_offers" USING btree ("source","url");
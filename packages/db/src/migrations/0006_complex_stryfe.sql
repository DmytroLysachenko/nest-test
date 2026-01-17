CREATE TABLE "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"career_profile_id" uuid NOT NULL,
	"profile_version" integer NOT NULL,
	"job_description" text NOT NULL,
	"score" integer NOT NULL,
	"min_score" integer,
	"is_match" boolean DEFAULT false NOT NULL,
	"matched_skills" jsonb,
	"matched_roles" jsonb,
	"matched_strengths" jsonb,
	"matched_keywords" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_career_profile_id_career_profiles_id_fk" FOREIGN KEY ("career_profile_id") REFERENCES "public"."career_profiles"("id") ON DELETE cascade ON UPDATE no action;
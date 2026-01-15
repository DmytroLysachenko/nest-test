ALTER TABLE "career_profiles" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
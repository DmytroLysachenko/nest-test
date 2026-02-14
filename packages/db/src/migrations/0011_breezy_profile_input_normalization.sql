ALTER TABLE "profile_inputs" ADD COLUMN "normalized_input" jsonb;--> statement-breakpoint
ALTER TABLE "profile_inputs" ADD COLUMN "normalization_meta" jsonb;--> statement-breakpoint
ALTER TABLE "profile_inputs" ADD COLUMN "normalization_version" varchar(32);

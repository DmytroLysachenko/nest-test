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
ALTER TABLE "api_request_events" ADD CONSTRAINT "api_request_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_request_events_request_created_at_idx" ON "api_request_events" USING btree ("request_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_request_events_user_created_at_idx" ON "api_request_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_request_events_level_created_at_idx" ON "api_request_events" USING btree ("level","created_at" DESC NULLS LAST);

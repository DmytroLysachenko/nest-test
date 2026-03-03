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
ALTER TABLE "job_source_run_attempts" ADD CONSTRAINT "job_source_run_attempts_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_run_attempts_run_attempt_uidx" ON "job_source_run_attempts" USING btree ("source_run_id","attempt_no");
--> statement-breakpoint
CREATE INDEX "job_source_run_attempts_run_created_at_idx" ON "job_source_run_attempts" USING btree ("source_run_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "attempt_no" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "payload_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD COLUMN "emitted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "offer_identity_key" text;
--> statement-breakpoint
UPDATE "job_offers"
SET "offer_identity_key" = CASE
	WHEN "source_id" IS NOT NULL AND btrim("source_id") <> '' THEN lower('source:' || btrim("source_id"))
	ELSE lower('url:' || regexp_replace("url", '[?#].*$', ''))
END;
--> statement-breakpoint
CREATE UNIQUE INDEX "job_offers_source_identity_key_unique" ON "job_offers" USING btree ("source","offer_identity_key");

CREATE TABLE "job_source_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"trace_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"request_id" varchar(128),
	"phase" varchar(64),
	"attempt_no" integer,
	"code" varchar(128),
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "trace_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "job_source_run_events" ADD CONSTRAINT "job_source_run_events_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_source_run_events_run_created_at_idx" ON "job_source_run_events" USING btree ("source_run_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_run_events_trace_created_at_idx" ON "job_source_run_events" USING btree ("trace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_run_events_type_created_at_idx" ON "job_source_run_events" USING btree ("event_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_trace_id_idx" ON "job_source_runs" USING btree ("trace_id");
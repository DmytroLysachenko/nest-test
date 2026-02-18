CREATE TABLE "job_source_callback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"event_id" varchar(128) NOT NULL,
	"request_id" varchar(128),
	"status" varchar(32) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" text
);
--> statement-breakpoint
ALTER TABLE "job_source_callback_events" ADD CONSTRAINT "job_source_callback_events_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_callback_events_run_event_uidx" ON "job_source_callback_events" USING btree ("source_run_id","event_id");--> statement-breakpoint
CREATE INDEX "job_source_callback_events_run_received_at_idx" ON "job_source_callback_events" USING btree ("source_run_id","received_at" DESC NULLS LAST);

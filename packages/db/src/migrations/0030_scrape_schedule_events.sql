CREATE TABLE "scrape_schedule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source_run_id" uuid,
	"trace_id" uuid,
	"request_id" varchar(128),
	"event_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"code" varchar(128),
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrape_schedule_events" ADD CONSTRAINT "scrape_schedule_events_schedule_id_scrape_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."scrape_schedules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scrape_schedule_events" ADD CONSTRAINT "scrape_schedule_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scrape_schedule_events" ADD CONSTRAINT "scrape_schedule_events_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "scrape_schedule_events_schedule_created_at_idx" ON "scrape_schedule_events" USING btree ("schedule_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "scrape_schedule_events_user_created_at_idx" ON "scrape_schedule_events" USING btree ("user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "scrape_schedule_events_source_run_created_at_idx" ON "scrape_schedule_events" USING btree ("source_run_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "scrape_schedule_events_type_created_at_idx" ON "scrape_schedule_events" USING btree ("event_type","created_at" DESC NULLS LAST);

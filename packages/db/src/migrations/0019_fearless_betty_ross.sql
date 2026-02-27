ALTER TABLE "job_source_runs" ADD COLUMN "failure_type" varchar(32);--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "retry_of_run_id" uuid;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD CONSTRAINT "job_source_runs_retry_of_run_id_job_source_runs_id_fk" FOREIGN KEY ("retry_of_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_source_runs_status_created_at_idx" ON "job_source_runs" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_retry_of_created_at_idx" ON "job_source_runs" USING btree ("retry_of_run_id","created_at" DESC NULLS LAST);
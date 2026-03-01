ALTER TABLE "job_source_runs" ADD COLUMN "last_heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "progress" jsonb;--> statement-breakpoint
CREATE INDEX "job_source_runs_user_created_at_idx" ON "job_source_runs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_user_heartbeat_at_idx" ON "job_source_runs" USING btree ("user_id","last_heartbeat_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_source_status_created_at_idx" ON "job_source_runs" USING btree ("source","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_job_offers_user_source_run_last_status_at_idx" ON "user_job_offers" USING btree ("user_id","source_run_id","last_status_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_matches_user_created_at_idx" ON "job_matches" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_matches_user_is_match_score_idx" ON "job_matches" USING btree ("user_id","is_match","score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_offers_source_run_fetched_at_idx" ON "job_offers" USING btree ("source","run_id","fetched_at" DESC NULLS LAST);

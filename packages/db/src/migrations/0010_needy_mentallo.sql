CREATE INDEX "career_profiles_user_active_status_created_at_idx" ON "career_profiles" USING btree ("user_id","is_active","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_source_runs_user_status_created_at_idx" ON "job_source_runs" USING btree ("user_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_offers_source_fetched_at_idx" ON "job_offers" USING btree ("source","fetched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_job_offers_user_status_last_status_at_idx" ON "user_job_offers" USING btree ("user_id","status","last_status_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_job_offers_tags_gin_idx" ON "user_job_offers" USING gin ("tags");
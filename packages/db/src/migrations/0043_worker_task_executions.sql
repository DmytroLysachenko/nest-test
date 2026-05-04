CREATE TABLE IF NOT EXISTS "worker_task_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_run_id" uuid NOT NULL,
  "task_id" varchar(128) NOT NULL,
  "trace_id" uuid,
  "request_id" varchar(128),
  "dedupe_key" varchar(128),
  "queue_provider" varchar(32),
  "status" varchar(32) NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "lease_expires_at" timestamp with time zone,
  "error" text,
  "meta" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "worker_task_executions"
  ADD CONSTRAINT "worker_task_executions_source_run_id_job_source_runs_id_fk"
  FOREIGN KEY ("source_run_id")
  REFERENCES "public"."job_source_runs"("id")
  ON DELETE cascade
  ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "worker_task_executions_source_run_uidx"
ON "worker_task_executions" ("source_run_id");

CREATE UNIQUE INDEX IF NOT EXISTS "worker_task_executions_task_id_uidx"
ON "worker_task_executions" ("task_id");

CREATE INDEX IF NOT EXISTS "worker_task_executions_status_lease_idx"
ON "worker_task_executions" ("status", "lease_expires_at");

CREATE INDEX IF NOT EXISTS "worker_task_executions_trace_created_at_idx"
ON "worker_task_executions" ("trace_id", "created_at" DESC);

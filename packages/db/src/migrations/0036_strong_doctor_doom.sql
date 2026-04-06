CREATE TABLE "source_automation_states" (
	"source" "job_source" PRIMARY KEY NOT NULL,
	"paused_reason" varchar(64),
	"opened_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"failure_mix" jsonb,
	"override_cleared_at" timestamp with time zone,
	"override_note" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "source_automation_states_expires_at_idx" ON "source_automation_states" USING btree ("expires_at");

CREATE TABLE "roles" (
	"name" varchar(64) PRIMARY KEY NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_name" varchar(64) NOT NULL,
	"permission_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("role_name","permission_key")
);
--> statement-breakpoint
CREATE TABLE "scrape_execution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"trace_id" uuid,
	"request_id" varchar(128),
	"stage" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"code" varchar(128),
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"role" varchar(64),
	"permission" varchar(128),
	"resource" varchar(128),
	"action" varchar(32) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"request_id" varchar(128),
	"method" varchar(16),
	"path" text,
	"reason" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_name_roles_name_fk" FOREIGN KEY ("role_name") REFERENCES "public"."roles"("name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scrape_execution_events" ADD CONSTRAINT "scrape_execution_events_source_run_id_job_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "authorization_events" ADD CONSTRAINT "authorization_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_key");
--> statement-breakpoint
CREATE INDEX "scrape_execution_events_run_created_at_idx" ON "scrape_execution_events" USING btree ("source_run_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX "scrape_execution_events_stage_created_at_idx" ON "scrape_execution_events" USING btree ("stage","created_at" desc);
--> statement-breakpoint
CREATE INDEX "scrape_execution_events_request_created_at_idx" ON "scrape_execution_events" USING btree ("request_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX "authorization_events_user_created_at_idx" ON "authorization_events" USING btree ("user_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX "authorization_events_permission_created_at_idx" ON "authorization_events" USING btree ("permission","created_at" desc);
--> statement-breakpoint
CREATE INDEX "authorization_events_request_created_at_idx" ON "authorization_events" USING btree ("request_id","created_at" desc);
--> statement-breakpoint
INSERT INTO "roles" ("name", "description", "is_system")
VALUES
	('user', 'Default authenticated user role', true),
	('admin', 'Administrative role with ops and support access', true)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permissions" ("key", "description")
VALUES
	('ops.read', 'Read operations and support views'),
	('ops.reconcile', 'Reconcile stale runs and view operational controls'),
	('ops.callbacks.replay', 'Replay worker callback dead letters'),
	('catalog.rematch', 'Trigger catalog rematch actions'),
	('user.manage', 'Inspect and update user roles')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_name", "permission_key")
VALUES
	('admin', 'ops.read'),
	('admin', 'ops.reconcile'),
	('admin', 'ops.callbacks.replay'),
	('admin', 'catalog.rematch'),
	('admin', 'user.manage')
ON CONFLICT ("role_name","permission_key") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "classified_outcome" varchar(64);
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "empty_reason" varchar(64);
--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD COLUMN "source_quality" varchar(32);

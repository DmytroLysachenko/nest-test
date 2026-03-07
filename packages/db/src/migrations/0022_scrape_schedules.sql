CREATE TABLE "scrape_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "enabled" integer DEFAULT 0 NOT NULL,
  "cron" varchar(128) DEFAULT '0 9 * * *' NOT NULL,
  "timezone" varchar(64) DEFAULT 'Europe/Warsaw' NOT NULL,
  "source" varchar(32) DEFAULT 'pracuj-pl-it' NOT NULL,
  "limit" integer DEFAULT 20 NOT NULL,
  "career_profile_id" uuid,
  "filters" jsonb,
  "last_triggered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrape_schedules"
ADD CONSTRAINT "scrape_schedules_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "scrape_schedules_user_unique_idx" ON "scrape_schedules" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "scrape_schedules_enabled_updated_idx" ON "scrape_schedules" USING btree ("enabled","updated_at" DESC);

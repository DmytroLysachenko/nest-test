CREATE TABLE "notebook_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "filters" jsonb NOT NULL,
  "saved_preset" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_preferences" ADD CONSTRAINT "notebook_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "notebook_preferences_user_uidx" ON "notebook_preferences" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "notebook_preferences_user_updated_at_idx" ON "notebook_preferences" USING btree ("user_id","updated_at" DESC NULLS LAST);

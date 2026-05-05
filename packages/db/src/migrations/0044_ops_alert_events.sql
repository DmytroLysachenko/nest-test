CREATE TABLE IF NOT EXISTS "ops_alert_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel" varchar(32) NOT NULL,
  "alert_key" varchar(128) NOT NULL,
  "payload_hash" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "http_status" integer,
  "delivered_at" timestamp with time zone,
  "error" text,
  "meta" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ops_alert_events_alert_key_created_at_idx"
ON "ops_alert_events" ("alert_key", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ops_alert_events_status_created_at_idx"
ON "ops_alert_events" ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "ops_alert_events_payload_hash_created_at_idx"
ON "ops_alert_events" ("payload_hash", "created_at" DESC);

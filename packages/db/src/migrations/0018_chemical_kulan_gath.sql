CREATE TABLE "document_stage_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stage" varchar(32) NOT NULL,
	"status" varchar(16) NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_stage_metrics" ADD CONSTRAINT "document_stage_metrics_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_stage_metrics" ADD CONSTRAINT "document_stage_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_stage_metrics_user_stage_created_at_idx" ON "document_stage_metrics" USING btree ("user_id","stage","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "document_stage_metrics_stage_created_at_idx" ON "document_stage_metrics" USING btree ("stage","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "document_stage_metrics_document_created_at_idx" ON "document_stage_metrics" USING btree ("document_id","created_at" DESC NULLS LAST);
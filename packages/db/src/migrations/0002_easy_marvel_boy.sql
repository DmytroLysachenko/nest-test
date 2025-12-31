ALTER TABLE "career_profiles" ADD COLUMN "document_ids" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extracted_at" timestamp with time zone;
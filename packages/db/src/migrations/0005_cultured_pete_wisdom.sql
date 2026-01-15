CREATE TYPE "public"."document_extraction_status" AS ENUM('PENDING', 'READY', 'FAILED');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extraction_status" "document_extraction_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extraction_error" text;
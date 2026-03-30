CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "canonical_name" varchar(255) NOT NULL,
  "normalized_name" varchar(255) NOT NULL,
  "primary_source" varchar(64),
  "source_profile_url" text,
  "website_url" text,
  "logo_url" text,
  "description" text,
  "hq_location" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "company_aliases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "alias" varchar(255) NOT NULL,
  "normalized_alias" varchar(255) NOT NULL,
  "source" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "job_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "employment_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "contract_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "work_modes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "job_category_id" uuid;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "employment_type_id" uuid;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "contract_type_id" uuid;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "work_mode_id" uuid;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_job_category_id_job_categories_id_fk" FOREIGN KEY ("job_category_id") REFERENCES "public"."job_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_employment_type_id_employment_types_id_fk" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_contract_type_id_contract_types_id_fk" FOREIGN KEY ("contract_type_id") REFERENCES "public"."contract_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_work_mode_id_work_modes_id_fk" FOREIGN KEY ("work_mode_id") REFERENCES "public"."work_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_normalized_name_unique" ON "companies" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "companies_canonical_name_idx" ON "companies" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "companies_last_seen_at_idx" ON "companies" USING btree ("last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "company_aliases_normalized_alias_unique" ON "company_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "company_aliases_company_id_idx" ON "company_aliases" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_categories_slug_unique" ON "job_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "job_categories_label_idx" ON "job_categories" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "employment_types_slug_unique" ON "employment_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "employment_types_label_idx" ON "employment_types" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_types_slug_unique" ON "contract_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "contract_types_label_idx" ON "contract_types" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "work_modes_slug_unique" ON "work_modes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "work_modes_label_idx" ON "work_modes" USING btree ("label");--> statement-breakpoint
CREATE INDEX "job_offers_company_id_idx" ON "job_offers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "job_offers_job_category_id_idx" ON "job_offers" USING btree ("job_category_id");--> statement-breakpoint
CREATE INDEX "job_offers_employment_type_id_idx" ON "job_offers" USING btree ("employment_type_id");--> statement-breakpoint
CREATE INDEX "job_offers_contract_type_id_idx" ON "job_offers" USING btree ("contract_type_id");--> statement-breakpoint
CREATE INDEX "job_offers_work_mode_id_idx" ON "job_offers" USING btree ("work_mode_id");

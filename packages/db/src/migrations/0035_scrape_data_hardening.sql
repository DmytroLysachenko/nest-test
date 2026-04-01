CREATE TABLE "company_source_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "source" varchar(64) NOT NULL,
  "source_company_key" varchar(255),
  "source_profile_url" text,
  "display_name" varchar(255),
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "seniority_levels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "work_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "label" varchar(128) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "technologies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(128) NOT NULL,
  "label" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "job_offer_source_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_offer_id" uuid NOT NULL,
  "run_id" uuid,
  "source" "job_source" NOT NULL,
  "source_id" text,
  "source_company_profile_url" text,
  "parser_version" varchar(64) NOT NULL,
  "normalization_version" varchar(64) NOT NULL,
  "observed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "company" text,
  "location" text,
  "salary" text,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" varchar(16),
  "salary_period" varchar(32),
  "salary_kind" varchar(32),
  "employment_type" text,
  "apply_url" text,
  "posted_at" timestamp with time zone,
  "description" text NOT NULL,
  "requirements" jsonb,
  "details" jsonb,
  "content_hash" text NOT NULL,
  "quality_state" "job_offer_quality_state" DEFAULT 'ACCEPTED' NOT NULL,
  "quality_reason" text,
  "company_id" uuid,
  "job_category_id" uuid,
  "employment_type_id" uuid,
  "contract_type_id" uuid,
  "work_mode_id" uuid
);--> statement-breakpoint
CREATE TABLE "job_offer_raw_payloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "observation_id" uuid NOT NULL,
  "payload_type" varchar(64) NOT NULL,
  "payload_json" jsonb,
  "payload_text" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "job_offer_contract_types" (
  "job_offer_id" uuid NOT NULL,
  "contract_type_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_offer_contract_types_pk" PRIMARY KEY("job_offer_id","contract_type_id")
);--> statement-breakpoint
CREATE TABLE "job_offer_work_modes" (
  "job_offer_id" uuid NOT NULL,
  "work_mode_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_offer_work_modes_pk" PRIMARY KEY("job_offer_id","work_mode_id")
);--> statement-breakpoint
CREATE TABLE "job_offer_work_schedules" (
  "job_offer_id" uuid NOT NULL,
  "work_schedule_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_offer_work_schedules_pk" PRIMARY KEY("job_offer_id","work_schedule_id")
);--> statement-breakpoint
CREATE TABLE "job_offer_seniority_levels" (
  "job_offer_id" uuid NOT NULL,
  "seniority_level_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_offer_seniority_levels_pk" PRIMARY KEY("job_offer_id","seniority_level_id")
);--> statement-breakpoint
CREATE TABLE "job_offer_technologies" (
  "job_offer_id" uuid NOT NULL,
  "technology_id" uuid NOT NULL,
  "category" varchar(32) DEFAULT 'all' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_offer_technologies_pk" PRIMARY KEY("job_offer_id","technology_id","category")
);--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "salary_currency" varchar(16);--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "salary_period" varchar(32);--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "salary_kind" varchar(32);--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "source_company_profile_url" text;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "apply_url" text;--> statement-breakpoint
ALTER TABLE "job_offers" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_source_profiles" ADD CONSTRAINT "company_source_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_run_id_job_source_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."job_source_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_job_category_id_job_categories_id_fk" FOREIGN KEY ("job_category_id") REFERENCES "public"."job_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_employment_type_id_employment_types_id_fk" FOREIGN KEY ("employment_type_id") REFERENCES "public"."employment_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_contract_type_id_contract_types_id_fk" FOREIGN KEY ("contract_type_id") REFERENCES "public"."contract_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_source_observations" ADD CONSTRAINT "job_offer_source_observations_work_mode_id_work_modes_id_fk" FOREIGN KEY ("work_mode_id") REFERENCES "public"."work_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_raw_payloads" ADD CONSTRAINT "job_offer_raw_payloads_observation_id_job_offer_source_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."job_offer_source_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_contract_types" ADD CONSTRAINT "job_offer_contract_types_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_contract_types" ADD CONSTRAINT "job_offer_contract_types_contract_type_id_contract_types_id_fk" FOREIGN KEY ("contract_type_id") REFERENCES "public"."contract_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_work_modes" ADD CONSTRAINT "job_offer_work_modes_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_work_modes" ADD CONSTRAINT "job_offer_work_modes_work_mode_id_work_modes_id_fk" FOREIGN KEY ("work_mode_id") REFERENCES "public"."work_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_work_schedules" ADD CONSTRAINT "job_offer_work_schedules_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_work_schedules" ADD CONSTRAINT "job_offer_work_schedules_work_schedule_id_work_schedules_id_fk" FOREIGN KEY ("work_schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_seniority_levels" ADD CONSTRAINT "job_offer_seniority_levels_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_seniority_levels" ADD CONSTRAINT "job_offer_seniority_levels_seniority_level_id_seniority_levels_id_fk" FOREIGN KEY ("seniority_level_id") REFERENCES "public"."seniority_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_technologies" ADD CONSTRAINT "job_offer_technologies_job_offer_id_job_offers_id_fk" FOREIGN KEY ("job_offer_id") REFERENCES "public"."job_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_offer_technologies" ADD CONSTRAINT "job_offer_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_source_profiles_source_profile_url_unique" ON "company_source_profiles" USING btree ("source","source_profile_url");--> statement-breakpoint
CREATE UNIQUE INDEX "company_source_profiles_source_company_key_unique" ON "company_source_profiles" USING btree ("source","source_company_key");--> statement-breakpoint
CREATE INDEX "company_source_profiles_company_idx" ON "company_source_profiles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seniority_levels_slug_unique" ON "seniority_levels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "seniority_levels_label_idx" ON "seniority_levels" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "work_schedules_slug_unique" ON "work_schedules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "work_schedules_label_idx" ON "work_schedules" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "technologies_slug_unique" ON "technologies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "technologies_label_idx" ON "technologies" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "job_offer_source_observations_job_offer_content_hash_unique" ON "job_offer_source_observations" USING btree ("job_offer_id","content_hash");--> statement-breakpoint
CREATE INDEX "job_offer_source_observations_job_offer_observed_at_idx" ON "job_offer_source_observations" USING btree ("job_offer_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_offer_source_observations_run_observed_at_idx" ON "job_offer_source_observations" USING btree ("run_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_offer_source_observations_source_source_id_idx" ON "job_offer_source_observations" USING btree ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_offer_raw_payloads_observation_payload_type_unique" ON "job_offer_raw_payloads" USING btree ("observation_id","payload_type");--> statement-breakpoint
CREATE INDEX "job_offer_raw_payloads_observation_idx" ON "job_offer_raw_payloads" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "job_offer_contract_types_contract_type_idx" ON "job_offer_contract_types" USING btree ("contract_type_id");--> statement-breakpoint
CREATE INDEX "job_offer_work_modes_work_mode_idx" ON "job_offer_work_modes" USING btree ("work_mode_id");--> statement-breakpoint
CREATE INDEX "job_offer_work_schedules_work_schedule_idx" ON "job_offer_work_schedules" USING btree ("work_schedule_id");--> statement-breakpoint
CREATE INDEX "job_offer_seniority_levels_seniority_idx" ON "job_offer_seniority_levels" USING btree ("seniority_level_id");--> statement-breakpoint
CREATE INDEX "job_offer_technologies_technology_idx" ON "job_offer_technologies" USING btree ("technology_id");--> statement-breakpoint
CREATE INDEX "job_offers_source_company_profile_url_idx" ON "job_offers" USING btree ("source_company_profile_url");--> statement-breakpoint
CREATE INDEX "job_offers_salary_range_idx" ON "job_offers" USING btree ("salary_currency","salary_min","salary_max");--> statement-breakpoint
CREATE INDEX "job_offers_posted_at_idx" ON "job_offers" USING btree ("posted_at" DESC NULLS LAST);

ALTER TABLE "career_profiles" ADD COLUMN "primary_seniority" varchar(32);--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "target_roles" text[];--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "searchable_keywords" text[];--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "searchable_technologies" text[];--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "preferred_work_modes" text[];--> statement-breakpoint
ALTER TABLE "career_profiles" ADD COLUMN "preferred_employment_types" text[];--> statement-breakpoint
UPDATE "career_profiles" cp
SET
  "primary_seniority" = NULLIF(cp."content_json" #>> '{candidateCore,seniority,primary}', ''),
  "target_roles" = (
    SELECT ARRAY_AGG(role_title)
    FROM (
      SELECT DISTINCT NULLIF(elem->>'title', '') AS role_title
      FROM jsonb_array_elements(COALESCE(cp."content_json"->'targetRoles', '[]'::jsonb)) elem
    ) role_values
    WHERE role_title IS NOT NULL
  ),
  "searchable_keywords" = (
    SELECT ARRAY_AGG(keyword_value)
    FROM (
      SELECT DISTINCT NULLIF(elem->>'value', '') AS keyword_value
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{searchSignals,keywords}', '[]'::jsonb)) elem
    ) keyword_values
    WHERE keyword_value IS NOT NULL
  ),
  "searchable_technologies" = (
    SELECT ARRAY_AGG(technology_value)
    FROM (
      SELECT DISTINCT NULLIF(elem->>'value', '') AS technology_value
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{searchSignals,technologies}', '[]'::jsonb)) elem
    ) technology_values
    WHERE technology_value IS NOT NULL
  ),
  "preferred_work_modes" = (
    SELECT ARRAY_AGG(work_mode)
    FROM (
      SELECT DISTINCT NULLIF(elem #>> '{}', '') AS work_mode
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{workPreferences,hardConstraints,workModes}', '[]'::jsonb)) elem
      UNION
      SELECT DISTINCT NULLIF(elem #>> '{value}', '') AS work_mode
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{workPreferences,softPreferences,workModes}', '[]'::jsonb)) elem
    ) work_mode_values
    WHERE work_mode IS NOT NULL
  ),
  "preferred_employment_types" = (
    SELECT ARRAY_AGG(employment_type)
    FROM (
      SELECT DISTINCT NULLIF(elem #>> '{}', '') AS employment_type
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{workPreferences,hardConstraints,employmentTypes}', '[]'::jsonb)) elem
      UNION
      SELECT DISTINCT NULLIF(elem #>> '{value}', '') AS employment_type
      FROM jsonb_array_elements(COALESCE(cp."content_json" #> '{workPreferences,softPreferences,employmentTypes}', '[]'::jsonb)) elem
    ) employment_values
    WHERE employment_type IS NOT NULL
  )
WHERE cp."content_json" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "career_profiles_user_active_seniority_idx" ON "career_profiles" USING btree ("user_id","is_active","primary_seniority");

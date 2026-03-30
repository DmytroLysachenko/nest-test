# Catalog Standardization Implementation Plan

Last updated: 2026-03-30

## Purpose

This document defines the implementation stream for catalog standardization, adaptive scrape yield improvement, and OTP activation.

It is the execution spec for the next 10 commits.

## Summary

This stream improves the product in three linked ways:

1. standardize repeated scrape data into SQL-friendly entities
2. improve scrape acquisition so profile-led runs still target a minimum useful amount of fresh offers
3. activate the existing OTP persistence lifecycle so it is actually operational

## Locked decisions

The implementation stream uses these defaults:

1. phase-1 normalization scope is company plus taxonomy core
2. taxonomy core means:
   - `companies`
   - `company_aliases`
   - `job_categories`
   - `employment_types`
   - `contract_types`
   - `work_modes`
3. `job_offers` remains the canonical offer snapshot table
4. `user_job_offers` remains the user-owned workflow table
5. raw source snapshot fields stay during migration
6. one thin UX slice is included before the stream ends
7. OTP activation is included in the stream
8. multi-source rollout is out of scope for this wave

## Commit sequence

### 1. `docs: add catalog standardization implementation plan`

- create this file
- update implementation-history and code-to-doc references
- link the stream from scrape and notebook docs

### 2. `feat: add company and taxonomy core schema`

- add:
  - `companies`
  - `company_aliases`
  - `job_categories`
  - `employment_types`
  - `contract_types`
  - `work_modes`
- extend `job_offers` with nullable normalized references:
  - `company_id`
  - `job_category_id`
  - `employment_type_id`
  - `contract_type_id`
  - `work_mode_id`

### 3. `feat: add canonical normalization and mapping layer`

- add one shared normalization layer for:
  - company names
  - employment type
  - contract type
  - work mode
  - job category
- keep mapping conservative
- keep source-specific Pracuj ids separate from internal canonical labels

### 4. `feat: persist normalized entities during scrape ingestion`

- resolve and persist normalized company/taxonomy data during scrape upsert
- preserve raw snapshot values

### 5. `feat: backfill catalog normalization for existing rows`

- add idempotent backfill logic for normalized catalog columns
- report resolved vs unresolved rows

### 6. `feat: move matching and filtering onto normalized fields`

- prefer normalized SQL-backed fields over substring checks for structured concepts
- keep fallback for unresolved legacy rows

### 7. `feat: enforce minimum fresh-candidate scrape yield`

- keep profile-led scrape logic
- add minimum fresh candidate target
- avoid counting repeated already-linked results too generously
- keep diagnostics explicit

### 8. `feat: expose normalized company and taxonomy read model`

- extend job-offer responses with normalized labels and optional company summary
- keep existing fields for compatibility

### 9. `feat: add thin company and structured-offer UX slice`

- add one small company/structured-details section inside existing offer details surfaces

### 10. `fix: activate otp lifecycle and close stream docs`

- ensure OTP generation persists rows
- ensure verification marks rows used
- ensure expired/used OTPs are rejected

## Acceptance direction

The stream is successful if:

1. structured matching/filtering begins moving from substring logic to SQL-backed normalized fields
2. scrapes stop over-satisfying reuse with the same narrow existing result set
3. the app starts building reusable company and taxonomy knowledge
4. one visible product surface proves the new model is useful
5. OTP rows are finally observable in runtime use

## Related docs

- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/03_plans_and_roadmaps/04_feature_evolution_plan.md`
- `docs/02_product_workflows/20_scrape_feature.md`
- `docs/02_product_workflows/30_notebook_feature.md`

# Notebook Feature

Last updated: 2026-04-01

## Purpose

This feature is the main user workflow surface for reviewing, prioritizing, and managing job opportunities after acquisition.

## User value

It helps the user decide what to review now, move offers through a pipeline, and keep enough context to manage many applications.

## Scope

Includes opportunities/discovery queue, notebook views, pipeline states, filters, notes, tags, and follow-up fields.

Does not own raw scrape execution, document extraction, or authentication.

## Main workflow

1. API provides notebook-ready offers through `user_job_offers`.
2. Frontend shows discovery and active-work views.
3. User reviews, filters, changes status, and adds context.
4. API persists workflow changes on user-specific offer records.

## Responsibilities

- API:
  - notebook read models, status changes, user-offer workflow persistence
- Web:
  - opportunities, notebook, pipeline, filters, workflow interactions
- DB:
  - `user_job_offers` as the user-owned workflow layer
- Worker:
  - no primary ownership; only indirect input through acquisition

## Code areas

- `apps/api/src/features/job-offers`
- `apps/web/src/features/job-offers`
- `apps/web/src/features/workspace`

## Data model

Primary tables: `user_job_offers` and `job_offers`.

Important owned data: status, match metadata, notes, tags, follow-up fields, pipeline metadata, and prep materials.

Current catalog-facing read model additions:

- notebook and discovery offer details now include additive structured company and taxonomy summaries
- prep packet offer summaries now expose the same structured catalog context alongside raw listing fields

Schema references:

- `packages/db/src/schema/user-job-offers.ts`
- `packages/db/src/schema/job-offers.ts`

## APIs/events

Representative endpoints live under `apps/api/src/features/job-offers` and `apps/api/src/features/workspace`.

## Dependencies

Depends on auth, scrape/acquisition, and career profile matching.

Used by dashboard, opportunities, follow-up workflow, and future company-aware/offer-memory surfaces.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/03_plans_and_roadmaps/05_catalog_standardization_implementation_plan.md`
- `docs/06_engineering_standards/01_frontend_standards.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`

# Notebook Feature

Last updated: 2026-04-26

## Purpose

This feature is the main user workflow surface for reviewing, prioritizing, and managing job opportunities after acquisition.

## User value

It helps the user decide what to review now, move offers through a pipeline, and keep enough context to manage many applications.

## Scope

Includes opportunities/discovery queue, notebook views, pipeline states, filters, notes, tags, and follow-up fields.

Does not own raw scrape execution, document extraction, or authentication.

## Route ownership

`Notebook` is the active-work workspace.

It should own:

- application pipeline status
- notes and tags for kept roles
- follow-up planning
- prep work
- active application context

It should not own:

- global workspace direction
- automation setup
- broad profile readiness explanation except when notebook work is directly blocked

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
- notebook list items now also expose additive workflow attention signals derived from persisted follow-up and pipeline state
- notebook list and focus items now expose deterministic recommended actions derived by API, not duplicated in web
- notebook list responses now expose API-owned collection-state guidance for hidden/degraded/empty queue trust messaging

Current workflow-facing additions:

- dashboard/notebook focus lanes now include due-today, prep-next, and awaiting-decision slices
- reminder preview now exposes overdue, due-today, upcoming, and stale-pipeline work as an in-app read model without external notification delivery
- active pipeline bulk editing now supports decision checkpoints and prep-needed flags in addition to follow-up fields
- prep packet responses now include workflow-aware attention context and requirement highlights
- notebook is the intended singular owner of active application work even when discovery and dashboard routes link into it
- notebook controls are now explicitly pipeline-scoped on the route itself; discovery refresh and broader orientation no longer ride along inside the main notebook controls
- notebook route rendering now depends on notebook-owned queries plus a minimal route-level update-status input for empty-state trust messaging, instead of reusing the full workspace summary inside the notebook page hook

Schema references:

- `packages/db/src/schema/user-job-offers.ts`
- `packages/db/src/schema/job-offers.ts`

## APIs/events

Representative endpoints live under `apps/api/src/features/job-offers` and `apps/api/src/features/workspace`.

Current reminder/read-model endpoint:

- `GET /api/job-offers/reminders/preview`

## Dependencies

Depends on auth, scrape/acquisition, and career profile matching.

Used by dashboard, opportunities, follow-up workflow, and future company-aware/offer-memory surfaces.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/99_archive_legacy/05_catalog_standardization_implementation_plan.md`
- `docs/06_engineering_standards/01_frontend_standards.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`

# Scrape Feature

Last updated: 2026-03-30

## Purpose

This feature acquires job opportunities for the user, either by reusing the shared catalog or by triggering fresh source ingestion.

## User value

It helps the user get relevant opportunities, rerun acquisition when intent changes, and trust outcomes because the lifecycle is observable.

## Scope

Includes preflight, manual and scheduled runs, worker execution, parsing, normalization, callback completion, catalog persistence, and diagnostics.

Does not own notebook status workflow or follow-up planning.

## Main workflow

1. User requests opportunities manually or via schedule.
2. API decides between catalog rematch and fresh scrape.
3. Worker fetches, parses, and normalizes source data.
4. API upserts `job_offers`, matches offers, and updates `user_job_offers`.
5. Frontend surfaces the result in opportunities or notebook views.

## Responsibilities

- API:
  - preflight, enqueue, completion, rematch, persistence, diagnostics
- Worker:
  - fetch, parse, normalize, callback delivery
- Web:
  - scrape entry points, status visibility, opportunities entry
- DB:
  - run history, shared catalog, user linkage, schedule and forensic events

## Code areas

- `apps/api/src/features/job-sources`
- `apps/api/src/features/ops`
- `apps/worker/src/jobs`
- `apps/worker/src/sources/pracuj-pl`
- `apps/worker/src/db`

## Data model

Primary tables: `job_source_runs`, `job_offers`, `user_job_offers`, `scrape_schedule_events`, and scrape event tables.

Schema references:

- `packages/db/src/schema/job-source-runs.ts`
- `packages/db/src/schema/job-offers.ts`
- `packages/db/src/schema/user-job-offers.ts`
- `packages/db/src/schema/scrape-schedule-events.ts`

## APIs/events

Representative endpoints include `/api/job-sources/preflight`, `/api/job-sources/schedule`, `/api/job-sources/schedule/trigger-now`, and `/api/job-sources/runs/:id/events`.

Operational and recovery endpoints live under `apps/api/src/features/ops`.

## Dependencies

Depends on auth, profile input, career profile, worker adapters, and notebook linkage.

Used by opportunities, notebook, dashboard summary, and support/ops tools.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/03_plans_and_roadmaps/05_catalog_standardization_implementation_plan.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/04_architecture_and_data/02_pracuj_query_mapping.md`
- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`

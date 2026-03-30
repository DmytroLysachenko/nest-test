# Implementation History

Last updated: 2026-03-30

## Purpose

This document tracks major implementation shifts in chronological order.

It is not a full changelog. It exists to preserve the architectural story of the product so future work can build on deliberate decisions instead of rediscovering them.

## History

### `001` Core scrape run and shared offer foundation

Summary:

- introduced `job_source_runs`
- introduced shared `job_offers`
- established worker-to-API scrape completion flow

Primary code areas:

- `packages/db/src/schema/job-source-runs.ts`
- `packages/db/src/schema/job-offers.ts`
- `apps/api/src/features/job-sources`
- `apps/worker/src/jobs`

Related docs:

- `docs/04_architecture_and_data/01_decisions.md`
- `docs/05_operations_and_deployment/01_runbook.md`

### `002` User-specific notebook linkage

Summary:

- introduced `user_job_offers`
- separated shared catalog data from user workflow state

Primary code areas:

- `packages/db/src/schema/user-job-offers.ts`
- `apps/api/src/features/job-offers`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`

### `003` Catalog rematch and offer-quality direction

Summary:

- shifted from scrape-only acquisition toward catalog reuse and rematch
- added freshness and quality signals to catalog offers

Primary code areas:

- `packages/db/src/schema/job-offers.ts`
- `apps/api/src/features/job-sources/job-sources.service.ts`
- `apps/api/src/features/job-offers/job-offers.service.ts`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/04_architecture_and_data/01_decisions.md`

### `004` Scrape observability and schedule audit trail

Summary:

- expanded scrape lifecycle observability
- added schedule-event persistence and stronger operational debugging

Primary code areas:

- `packages/db/src/schema/scrape-schedule-events.ts`
- `apps/api/src/features/job-sources`
- `apps/api/src/features/ops`
- `apps/worker/src/db`

Related docs:

- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`

### `005` Notebook workflow differentiation

Summary:

- product shifted from simple results display toward notebook-first workflow and action planning

Primary code areas:

- `apps/web/src/features/job-offers`
- `apps/web/src/features/workspace`
- `apps/api/src/features/job-offers`

Related docs:

- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/01_project_context/02_project_state.md`

### `006` Documentation system restructuring

Summary:

- introduced numbered doc folders
- separated project context, workflows, plans, architecture, operations, standards, and archive
- introduced documentation standards and code-to-doc ownership mapping

Primary code areas:

- `docs/`
- `README.md`
- `AGENTS.md`

Related docs:

- `docs/00_documentation_system/00_docs_index.md`
- `docs/00_documentation_system/01_documentation_standards.md`
- `docs/00_documentation_system/03_code_to_docs_map.md`

### `007` Planned catalog and company-domain shift

Summary:

- documented the next intended product/data evolution
- prioritized catalog enrichment and company entities before multi-source expansion

Primary code areas:

- `packages/db/src/schema/job-offers.ts`
- `packages/db/src/schema/user-job-offers.ts`
- `apps/worker/src/sources/pracuj-pl`
- `apps/api/src/features/job-sources`

Related docs:

- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/03_plans_and_roadmaps/05_catalog_standardization_implementation_plan.md`

### `008` Catalog normalization persistence and backfill path

Summary:

- added shared catalog normalization helpers
- ingestion now persists normalized company and taxonomy refs when confidence is acceptable
- added reusable backfill path for existing `job_offers`

Primary code areas:

- `packages/db/src/catalog-normalization.ts`
- `packages/db/src/catalog-persistence.ts`
- `packages/db/src/catalog-backfill.ts`
- `apps/api/src/features/job-sources/job-sources.service.ts`
- `apps/worker/src/db/persist-scrape.ts`

Related docs:

- `docs/03_plans_and_roadmaps/05_catalog_standardization_implementation_plan.md`
- `docs/02_product_workflows/20_scrape_feature.md`

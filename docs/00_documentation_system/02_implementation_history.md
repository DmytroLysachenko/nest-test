# Implementation History

Last updated: 2026-04-26

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
- `docs/99_archive_legacy/05_catalog_standardization_implementation_plan.md`

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

- `docs/99_archive_legacy/05_catalog_standardization_implementation_plan.md`
- `docs/02_product_workflows/20_scrape_feature.md`

### `009` Structured catalog read models and single-use OTP lifecycle

Summary:

- extended notebook/discovery read models with normalized company and taxonomy context
- added a thin structured-offer UX slice in discovery and notebook details
- made OTP codes single-use by consuming rows on verification instead of treating them as read-only

Primary code areas:

- `apps/api/src/features/job-offers`
- `apps/web/src/features/job-offers`
- `apps/api/src/features/auth`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/04_architecture_and_data/01_decisions.md`

### `010` Visible fresh-candidate reuse diagnostics

Summary:

- made scrape enqueue responses explain when catalog rematch or DB reuse was rejected before worker dispatch
- surfaced fresh-candidate gating decisions in product-facing job-source metadata

Primary code areas:

- `apps/api/src/features/job-sources`
- `apps/web/src/features/job-sources`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/04_architecture_and_data/01_decisions.md`

### `011` Scrape observation ledger and normalized multi-value offer model

Summary:

- split canonical current offer state from per-run source observations and raw payload forensics
- added normalized multi-value relations for contract types, work modes, schedules, seniority, and technologies
- extended read models and source-health diagnostics to prefer and report the richer structured model

Primary code areas:

- `packages/db/src/schema/job-offer-source-observations.ts`
- `packages/db/src/schema/job-offer-raw-payloads.ts`
- `packages/db/src/schema/job-offer-contract-types.ts`
- `packages/db/src/schema/job-offer-work-modes.ts`
- `packages/db/src/schema/job-offer-work-schedules.ts`
- `packages/db/src/schema/job-offer-seniority-levels.ts`
- `packages/db/src/schema/job-offer-technologies.ts`
- `packages/db/src/catalog-persistence.ts`
- `packages/db/src/catalog-backfill.ts`
- `apps/api/src/features/job-offers`
- `apps/api/src/features/job-sources`
- `apps/worker/src/sources/pracuj-pl`

Related docs:

- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/02_product_workflows/20_scrape_feature.md`
- `docs/04_architecture_and_data/01_decisions.md`

### `012` Workflow attention and active-offer trust messaging

Summary:

- added server-driven workflow attention signals for notebook offers and prep packets
- expanded dashboard focus/action-plan lanes with due-today, prep-next, and awaiting-decision slices
- made notebook/opportunities hidden and degraded states explicitly explainable instead of relying only on frontend inference

Primary code areas:

- `apps/api/src/features/job-offers`
- `apps/web/src/features/job-offers`
- `apps/web/src/features/workspace`

Related docs:

- `docs/02_product_workflows/30_notebook_feature.md`
- `docs/02_product_workflows/35_opportunities_and_dashboard_feature.md`
- `docs/04_architecture_and_data/01_decisions.md`

### `013` API modularization baseline and repo-wide engineering standards

Summary:

- extracted pure `job-offers` feature logic into named feature-local modules instead of continuing to grow one service file
- documented repo-wide backend and modularization standards alongside the existing frontend standards
- made orchestration-first API services a durable architecture rule instead of an implicit preference

Primary code areas:

- `apps/api/src/features/job-offers`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`
- `docs/04_architecture_and_data/01_decisions.md`

Related docs:

- `docs/06_engineering_standards/02_backend_and_repo_standards.md`
- `docs/00_documentation_system/03_code_to_docs_map.md`

### `014` Product-surface boundary cleanup and role separation

Summary:

- finished the product-surface audit for the end-user web app
- removed remaining sourcing/debug phrasing from normal user routes and tightened the user/admin separation
- simplified shell/dashboard/planning/profile hierarchy so the product routes read like workflow pages instead of operator tooling
- documented schedule trust verification steps and archived the completed audit plan

Primary code areas:

- `apps/web/src/shared/ui/app-shell.tsx`
- `apps/web/src/features/workspace`
- `apps/web/src/features/job-sources`
- `apps/web/src/features/job-offers`
- `apps/web/src/features/profile-management`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/99_archive_legacy/03_product_surface_and_role_boundary_audit_plan_completed.md`

### `015` Information-architecture and workflow-ownership cleanup

Summary:

- clarified page ownership across home, planning, opportunities, notebook, progress, and profile
- reduced repeated blocker/readiness furniture on non-owning routes
- made notebook rendering depend on notebook-owned data instead of the broad workspace summary, with only minimal route-level handoff where needed
- archived the completed IA/workflow-ownership audit plan

Primary code areas:

- `apps/web/src/features/workspace`
- `apps/web/src/features/job-offers`
- `apps/web/src/features/profile-management`

Related docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/99_archive_legacy/11_information_architecture_and_workflow_ownership_audit_plan_completed.md`

### `016` Notebook throughput audit closure and successor frontend audit kickoff

Summary:

- archived the completed notebook throughput, reminder delivery, schedule trust, and companies audit plan
- opened the next active frontend audit focused on UI/UX simplification, trust-boundary hardening, input hygiene, and shared-state cleanup
- updated the active roadmap so the new frontend polish/hardening stream is the current web-facing successor slice

Primary code areas:

- `docs/99_archive_legacy/12_notebook_workflow_throughput_and_reminder_delivery_audit_plan_completed.md`
- `docs/03_plans_and_roadmaps/13_frontend_ui_ux_design_and_trust_hardening_audit_plan.md`

Related docs:

- `docs/03_plans_and_roadmaps/01_roadmap.md`

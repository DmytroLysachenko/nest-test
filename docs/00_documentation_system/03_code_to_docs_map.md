# Code To Docs Map

Last updated: 2026-03-30

## Purpose

This file maps major code areas to the docs that should be updated when those areas change.

## Ownership map

### `apps/api/src/features/job-sources`

Responsible docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`
- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md` when catalog/company direction changes

### `apps/api/src/features/job-offers`

Responsible docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`

### `apps/api/src/features/auth`

Responsible docs:

- `docs/01_project_context/02_project_state.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`

### `apps/worker/src/sources/pracuj-pl`

Responsible docs:

- `docs/04_architecture_and_data/02_pracuj_query_mapping.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`

### `apps/worker/src/jobs`

Responsible docs:

- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/01_project_context/02_project_state.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`

### `apps/web/src/features/job-offers`

Responsible docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/06_engineering_standards/01_frontend_standards.md`

### `apps/web/src/features/workspace`

Responsible docs:

- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/06_engineering_standards/01_frontend_standards.md`

### `packages/db/src/schema`

Responsible docs:

- `docs/04_architecture_and_data/01_decisions.md`
- `docs/01_project_context/02_project_state.md`
- `docs/06_engineering_standards/02_backend_and_repo_standards.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md` for catalog/company/history changes
- `docs/03_plans_and_roadmaps/05_catalog_standardization_implementation_plan.md` for the current standardization stream
- `docs/00_documentation_system/02_implementation_history.md` for meaningful schema shifts

### `packages/db/src/migrations`

Responsible docs:

- `docs/04_architecture_and_data/01_decisions.md` when migration reflects a design change
- `docs/00_documentation_system/02_implementation_history.md` for milestone-level evolution

### `docker/`, deploy scripts, CI workflows, Cloud Run wiring

Responsible docs:

- `docs/05_operations_and_deployment/03_prod_deploy_guide.md`
- `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md`
- `docs/05_operations_and_deployment/05_env_matrix.md`
- `docs/01_project_context/02_project_state.md` when capability status changes

## Update trigger

When a change touches one of the code areas above, treat the mapped docs as part of the definition of done.

# Docs Index

Last updated: 2026-03-30

## Purpose

This is the canonical entry point for repository documentation.

The docs system is now organized by numbered folders so that:

1. humans can scan it in a stable order
2. LLM agents can resolve the right document quickly
3. implementation history and planning stay traceable
4. old documents can be archived without polluting active guidance

## Folder structure

### `00_documentation_system`

Documentation governance, structure, history, and code-to-doc ownership.

- `00_docs_index.md`
- `01_documentation_standards.md`
- `02_implementation_history.md`
- `03_code_to_docs_map.md`

### `01_project_context`

High-signal documents describing the current project state and handoff context.

- `00_product_and_system_overview.md`
- `01_codex_handoff.md`
- `02_project_state.md`

### `02_product_workflows`

Product and domain shifts, feature workflow plans, and cross-cutting user-value documents.

- `00_feature_docs_index.md`
- `01_scrape_catalog_evolution_plan.md`
- `10_auth_feature.md`
- `12_onboarding_and_profile_input_feature.md`
- `20_scrape_feature.md`
- `30_notebook_feature.md`
- `35_opportunities_and_dashboard_feature.md`
- `40_documents_and_extraction_feature.md`
- `50_career_profile_and_matching_feature.md`
- `60_support_and_ops_feature.md`

### `03_plans_and_roadmaps`

Future-facing planning documents.

- `01_roadmap.md`
- `02_sprint_plan.md`
- `03_year_plan.md`
- `04_feature_evolution_plan.md`

### `04_architecture_and_data`

Architecture decisions, data-model notes, and implementation design references.

- `01_decisions.md`
- `02_pracuj_query_mapping.md`

### `05_operations_and_deployment`

Runtime operations, debugging, deploy guidance, and env/deploy contracts.

- `01_runbook.md`
- `02_e2e_debugging.md`
- `03_prod_deploy_guide.md`
- `04_gcp_deploy_matrix.md`
- `05_env_matrix.md`

### `06_engineering_standards`

Coding and architecture standards.

- `01_frontend_standards.md`
- `02_backend_and_repo_standards.md`

### `99_archive_legacy`

Superseded or low-priority docs kept only for historical reference.

- `01_operations_runbook_legacy.md`
- `02_deploy_step_by_step_legacy.md`

## Ordering rules

1. Folders are numbered by purpose, not by temporary priority.
2. Files are numbered within a folder by reading order.
3. New docs should not be added at the root of `docs/`.
4. If a doc becomes obsolete but still has historical value, move it to `99_archive_legacy`.

## Recommended reading order

1. `README.md`
2. `docs/00_documentation_system/01_documentation_standards.md`
3. `docs/01_project_context/00_product_and_system_overview.md`
4. `docs/01_project_context/01_codex_handoff.md`
5. `docs/01_project_context/02_project_state.md`
6. `docs/02_product_workflows/00_feature_docs_index.md`
7. `docs/03_plans_and_roadmaps/01_roadmap.md`
8. `docs/04_architecture_and_data/01_decisions.md`
9. `docs/05_operations_and_deployment/01_runbook.md`

## Maintenance expectation

When implementation changes:

1. update the relevant domain doc
2. update `02_implementation_history.md` for meaningful shifts
3. update `03_code_to_docs_map.md` if ownership changed
4. move docs to archive instead of leaving ambiguous duplicates behind

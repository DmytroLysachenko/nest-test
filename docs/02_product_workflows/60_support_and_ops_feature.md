# Support And Ops Feature

Last updated: 2026-03-30

## Purpose

This feature provides operator-facing visibility, diagnostics, and recovery tooling for production-like workflows.

## User value

It improves system trust indirectly by making failures explainable and recoverable instead of silent.

## Scope

Includes support overview, scrape diagnostics, callback visibility, reconciliation, replay tooling, and forensic/export surfaces.

Does not own end-user notebook workflow or source parsing logic itself.

## Main workflow

1. Support or developer inspects a failing workflow.
2. Ops endpoints expose current and historical state.
3. Operator uses replay, reconcile, export, or diagnostics tools.

## Responsibilities

- API:
  - support endpoints, diagnostics, reconciliation and export surfaces
- Worker:
  - emits the execution and callback traces ops relies on
- DB:
  - stores run, event, callback, and forensic history

## Code areas

- `apps/api/src/features/ops`
- `apps/api/src/features/job-sources`
- `apps/worker/src/db`

## Data model

Primary data inputs: `job_source_runs`, scrape execution events, callback event tables, schedule event tables, and API request event tables.

## APIs/events

Representative endpoints live under `apps/api/src/features/ops`.

## Dependencies

Depends on scrape lifecycle persistence, auth/access control, and support-oriented read models.

Used by incident response, deployment verification, and debugging.

## Related docs

- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`

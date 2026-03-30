# Documents And Extraction Feature

Last updated: 2026-03-30

## Purpose

This feature turns uploaded user documents into structured input for later profile generation and matching.

## User value

It reduces manual form filling and improves later profile and matching quality.

## Scope

Includes document upload, storage, extraction processing, retries, diagnostics, and readiness state.

Does not own final career profile generation, notebook workflow, or scrape execution.

## Main workflow

1. User uploads one or more documents.
2. API stores metadata and coordinates extraction.
3. Extraction results become available for later profile generation.
4. User and support flows can inspect diagnostics or retry failures.

## Responsibilities

- API:
  - upload lifecycle, extraction coordination, diagnostics, retries
- Web:
  - upload UX, document state visibility, retry entry points
- DB:
  - document and extraction state persistence
- External/storage layer:
  - document blob storage

## Code areas

- `apps/api/src/features/documents`
- `apps/api/src/features/gcs`
- `apps/web/src/features`

## Data model

Primary data areas: documents and extraction-related tables in `packages/db/src/schema`.

## APIs/events

Representative endpoints live under `apps/api/src/features/documents`.

## Dependencies

Depends on auth, storage configuration, and extraction pipeline services.

Used by career profile generation, workspace readiness, and support/ops diagnostics.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/05_operations_and_deployment/01_runbook.md`

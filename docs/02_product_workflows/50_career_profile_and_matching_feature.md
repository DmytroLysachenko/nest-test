# Career Profile And Matching Feature

Last updated: 2026-03-30

## Purpose

This feature transforms user intent and extracted documents into a canonical career profile, then uses that profile to evaluate and rank opportunities.

## User value

It improves relevance and trust by ranking opportunities against a structured representation of the user rather than only keyword search.

## Scope

Includes profile input, career profile generation, schema validation, matching logic, and explanation metadata.

Does not own raw scrape transport, notebook status workflow, or auth.

## Main workflow

1. User provides profile input and documents.
2. API generates a canonical career profile.
3. Matching logic evaluates catalog offers against that profile.
4. Match results are stored on `user_job_offers`.
5. Frontend uses ranking and explanations in opportunities and notebook views.

## Responsibilities

- API:
  - profile input handling, profile generation, validation, matching
- Web:
  - profile input surfaces and match-consumption views
- DB:
  - profile state plus match score and metadata persistence

## Code areas

- `apps/api/src/features/profile-inputs`
- `apps/api/src/features/career-profiles`
- `apps/api/src/features/job-offers`
- `apps/api/src/common/modules/gemini`

## Data model

Primary data areas: career profile tables, profile input tables, `user_job_offers.match_score`, and `user_job_offers.match_meta`.

## APIs/events

Representative endpoints live under `apps/api/src/features/career-profiles` and `apps/api/src/features/job-offers`.

## Dependencies

Depends on auth, documents/extraction, and the shared offer catalog.

Used by scrape rematch decisions, opportunities, notebook ranking, and dashboard summary.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/04_architecture_and_data/01_decisions.md`

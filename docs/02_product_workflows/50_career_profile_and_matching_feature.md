# Career Profile And Matching Feature

Last updated: 2026-04-17

## Purpose

This feature transforms user intent and extracted documents into a canonical career profile, then uses that profile to evaluate and rank opportunities.

## User value

It improves relevance and trust by ranking opportunities against a structured representation of the user rather than only keyword search.

## Scope

Includes profile input, career profile generation, schema validation, matching logic, and explanation metadata.

Current matching direction:

- prefer normalized contract/work-mode/category/seniority/technology context when the catalog has it
- use structured numeric salary before salary text parsing
- treat unknown salary as a soft evidence gap instead of a hard blocker
- use title or structured seniority for hard seniority blockers; full-description seniority is fallback evidence
- expand common technology aliases deterministically, such as JS/JavaScript, TS/TypeScript, React/React.js, Next/Next.js,
  Node/Node.js, Postgres/PostgreSQL, and Kubernetes/K8s
- keep raw-text fallback for unresolved legacy offers

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
- `apps/api/src/features/job-matching`
- `apps/api/src/features/job-offers`
- `apps/api/src/common/modules/gemini`

## Data model

Primary data areas: career profile tables, profile input tables, `user_job_offers.match_score`, and `user_job_offers.match_meta`.

`match_meta` stores deterministic evidence, hard constraint violations, soft gaps, score breakdown, and matched
competencies. New matching changes should preserve this auditability.

## Data Quality Audits

- `pnpm --filter @repo/db audit:matching-data-quality` reports offer coverage, score distribution, hard violations,
  noisy taxonomy rows, duplicate candidates, and user-offer match versions.
- `pnpm --filter @repo/db repair:taxonomy-dimensions` runs a dry-run report for known noisy taxonomy rows.
- `APPLY_CHANGES=true pnpm --filter @repo/db repair:taxonomy-dimensions` applies the taxonomy repair after dry-run review.

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

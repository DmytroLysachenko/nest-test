# Project State

Last updated: 2026-02-23

## Current Architecture

- Monorepo apps:
  - `apps/api` (NestJS orchestrator)
  - `apps/worker` (scraping/background tasks)
  - `apps/web` (Next.js frontend + internal tester)
- Shared packages:
  - `packages/db` (Drizzle schema/migrations/seeds)
  - `packages/ui` (shared UI primitives)

## Stable Flows Implemented

- Auth with refresh-token rotation.
- Profile input normalization.
- Document upload/extract flow.
- Career profile generation with strict JSON schema validation.
- Deterministic/hybrid job matching.
- Scrape orchestration from API to worker callback.
- User notebook flow for status/meta/history/scoring.
- End-to-end smoke script with DB seed + API/worker/web checks.

## Key Technical Decisions Active in Code

- Canonical career profile schema (`schemaVersion: "1.0.0"`).
- No v1/v2 dual-read path; schema replaced in-place pre-production.
- Worker scraping is service-oriented (API enqueues, worker callbacks).
- In-memory worker queue with controlled concurrency.
- Callback idempotency and optional callback signature validation.
- Callback retry uses exponential backoff + jitter with env-driven caps.
- Scraper ignores recommended offers and relaxes strict filters when zero results.
- Career profile now has denormalized search projection columns.
- API and worker enforce request body size limits (env-driven).
- API validates scrape listing URL allowlist per source before enqueue.

## Data Model Highlights

`career_profiles` stores:

- canonical JSON: `content_json`
- readable markdown: `content`
- denormalized query fields:
  - `primary_seniority`
  - `target_roles`
  - `searchable_keywords`
  - `searchable_technologies`
  - `preferred_work_modes`
  - `preferred_employment_types`

## New API Read Model

- `GET /api/career-profiles/search-view`
- Purpose:
  - fast filtering without parsing `content_json`
  - FE/tester support for profile diagnostics and search-readiness checks

## Current Risks / Gaps

- Global API throttling can interfere with intensive manual test loops.
- Some e2e scenarios still rely on live external scraping source behavior.
- Frontend standards are now explicitly documented in `docs/FRONTEND_STANDARDS.md`; continue enforcing via ESLint and reviews.
- Worker queue is still in-memory (acceptable for now, not crash-resilient across process restarts).

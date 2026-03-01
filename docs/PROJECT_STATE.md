# Project State

Last updated: 2026-03-01

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
- API enforces per-user active scrape backpressure (`SCRAPE_MAX_ACTIVE_RUNS_PER_USER`).
- Notebook supports ranking modes (`strict` / `approx` / `explore`) with explanation tags per offer.
- Notebook ranking calibration is env-tunable (approx penalties/bonuses and explore unscored base).
- Notebook ranking calibration now includes capped approx penalties and configurable explore recency weighting.
- Career profile exposes deterministic quality diagnostics endpoint.
- Scrape runs expose diagnostics endpoint (relaxation trail + source stats).
- Scrape runs expose aggregated diagnostics summary endpoint (`/job-sources/runs/diagnostics/summary`).
- Scrape diagnostics summary now supports optional timeline buckets (`hour` / `day`) and short-lived in-memory response cache.
- Scrape runs now persist deterministic lifecycle fields (`failure_type`, `finalized_at`, `retry_of_run_id`, `retry_count`).
- API lazily reconciles stale `PENDING/RUNNING` runs to terminal timeout failures.
- Failed scrape runs can be retried via `POST /job-sources/runs/:id/retry` with retry-chain linkage.
- Scrape run state transitions are now guard-railed by explicit lifecycle rules (`PENDING -> RUNNING|FAILED`, `RUNNING -> COMPLETED|FAILED`).
- Worker now emits authenticated scrape heartbeats to API (`/job-sources/runs/:id/heartbeat`) with lightweight progress payloads.
- Stale run reconciliation now prioritizes `last_heartbeat_at` over legacy timestamp-only heuristics.
- API scrape enqueue now applies short-window idempotency suppression for duplicate intents.
- Scrape retry now enforces configurable retry-chain depth cap.
- Admin ops metrics endpoint available at `/ops/metrics`.
- Ops metrics now expose scrape lifecycle counters (`staleReconciledRuns`, `retriesTriggered`, `retrySuccessRate`).
- Ops metrics now expose callback event breakdown (`failuresByType`, `failuresByCode`) and heartbeat freshness indicator (`runningWithoutHeartbeat`).
- Job matching now persists explanation metadata on each scored match (`job_matches.match_meta`) and exposes audit export endpoints.
- Documents now persist upload/extraction stage events (`document_events`) for diagnostics.
- Documents expose upload health and per-document diagnostics timeline endpoints.
- Documents now persist stage duration metrics (`document_stage_metrics`) and expose percentile summary endpoint (`/documents/diagnostics/summary`).
- Profile management page now includes direct document upload/confirm/extract flow with diagnostics visibility.
- New guided onboarding flow is available at `/app/onboarding` with persisted draft state and step-based UX.
- Profile input now supports structured intake payload (`intake_payload`) used for deterministic normalization.
- Main `/app` workspace is notebook-first dashboard; users without ready profile are redirected to onboarding.
- Onboarding draft persistence now supports both local draft and server-side draft recovery (`/onboarding/draft`).
- Workspace summary read model (`/workspace/summary`) powers dashboard cards and onboarding guard decisions.
- Workspace summary supports optional in-memory ttl cache (`WORKSPACE_SUMMARY_CACHE_TTL_SEC`).
- Production bootstrap rejects wildcard CORS (`ALLOWED_ORIGINS=*`) in production mode.

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

`job_matches` now stores:

- deterministic score summary fields (`score`, `is_match`, matched arrays)
- persisted explanation metadata: `match_meta` (engine/audit/breakdown/violations)

## New API Read Model

- `GET /api/career-profiles/search-view`
- `GET /api/workspace/summary`
- `GET /api/job-matching/audit`
- `GET /api/job-matching/audit/export.csv`
- `GET /api/documents/diagnostics/summary`
- Purpose:
  - fast filtering without parsing `content_json`
  - FE/tester support for profile diagnostics and search-readiness checks
  - dashboard aggregation with one API request
  - support/debug audit export for match explanations

## Current Risks / Gaps

- Global API throttling can interfere with intensive manual test loops.
- Some e2e scenarios still rely on live external scraping source behavior.
- Frontend standards are now explicitly documented in `docs/FRONTEND_STANDARDS.md`; continue enforcing via ESLint and reviews.
- Worker queue is still in-memory (acceptable for now, not crash-resilient across process restarts).
- Matching remains trust-first and now applies stronger ambiguity/context penalties for low-quality offer metadata.
- CI now uses split quality gates (`CI Verify`, `Smoke Gate`) and release candidate + manual promote workflows.
- Release candidate now builds and pushes api/worker/web container images to GCP Artifact Registry.
- Manual production promotion now deploys pinned SHA images to Cloud Run and runs post-deploy health verification.

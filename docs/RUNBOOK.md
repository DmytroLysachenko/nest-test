# Runbook

Day-to-day engineering runbook for local development and verification.

## Prerequisites

1. Node and pnpm installed.
2. `.env` files prepared:
   - `apps/api/.env`
   - `apps/web/.env`
   - `apps/worker/.env`
   - `packages/db/.env`
3. Postgres running and reachable.

## Security/Capacity Env Knobs

1. API:
   - `API_BODY_LIMIT` (example: `1mb`)
   - `SCRAPE_MAX_ACTIVE_RUNS_PER_USER` (per-user backpressure guard)
   - `ALLOWED_ORIGINS` must not be `*` in production mode
   - `WORKSPACE_SUMMARY_CACHE_TTL_SEC` (cache ttl for workspace summary read model)
   - `JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS` (default summary window)
   - `SCRAPE_STALE_PENDING_MINUTES` (stale pending run timeout threshold)
   - `SCRAPE_STALE_RUNNING_MINUTES` (stale running run timeout threshold)
   - `DOCUMENT_DIAGNOSTICS_WINDOW_HOURS` (default document diagnostics window)
   - `NOTEBOOK_APPROX_VIOLATION_PENALTY`
   - `NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY`
   - `NOTEBOOK_APPROX_SCORED_BONUS`
   - `NOTEBOOK_EXPLORE_UNSCORED_BASE`
   - `NOTEBOOK_EXPLORE_RECENCY_WEIGHT`
   - `WORKER_TASK_MAX_PAYLOAD_BYTES`
   - `SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC`
   - `SCRAPE_MAX_RETRY_CHAIN_DEPTH`
2. Worker:
  - `WORKER_MAX_BODY_BYTES` (example: `262144`)
  - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
  - `WORKER_CALLBACK_RETRY_JITTER_PCT`
  - `WORKER_HEARTBEAT_INTERVAL_MS`
  - `QUEUE_PROVIDER` (`local` or `cloud-tasks`)
  - `TASKS_AUTH_TOKEN` (required for `cloud-tasks`)

## Core Commands

1. Install dependencies:
   - `pnpm install`
2. Generate + migrate DB:
   - `pnpm --filter @repo/db generate`
   - `pnpm --filter @repo/db migrate`
3. Build shared DB package:
   - `pnpm --filter @repo/db build`
4. Start full stack:
   - `pnpm start`

## Fast Verification

1. API tests:
   - `pnpm --filter api test -- --runInBand`
2. Worker tests:
   - `pnpm --filter worker test`
3. Web checks:
   - `pnpm --filter web check-types`
   - `pnpm --filter web test`
   - `pnpm --filter web test:e2e`
4. End-to-end smoke:
   - `pnpm smoke:e2e`

## CI Branch Protection

1. Require passing checks before merge:
   - `CI Verify / lint`
   - `CI Verify / typecheck`
   - `CI Verify / test-build`
   - `Smoke Gate / smoke`
2. For release promotions:
   - `Release Candidate / build-and-validate` must pass
   - production promotion is manual via `Promote To Prod`

## Web Entry Routes

1. Main dashboard: `/app`
2. Guided profile onboarding: `/app/onboarding`
3. Internal endpoint tester (dev flag): `/app/tester`
4. Admin ops metrics: `GET /api/ops/metrics`
5. Job match audit export: `GET /api/job-matching/audit/export.csv`
6. Document diagnostics summary: `GET /api/documents/diagnostics/summary`
7. Retry failed scrape run: `POST /api/job-sources/runs/:id/retry`
8. Worker heartbeat callback (internal): `POST /api/job-sources/runs/:id/heartbeat`

## Smoke Coverage (Current)

`smoke:e2e` verifies:

1. fixture seeding
2. API/worker/web health
3. auth login + refresh rotation
4. profile-input endpoints
5. onboarding draft CRUD endpoints
6. career-profile endpoints
7. workspace summary endpoint
8. denormalized `career-profiles/search-view`
9. deterministic job matching
10. scrape enqueue + completion
11. notebook status/meta/history/score actions
12. worker + callback flow with retry-safe completion path
13. notebook ranking mode contract (`strict` + `approx`)
14. scrape diagnostics endpoint for completed run
15. document upload-health endpoint
16. document diagnostics summary endpoint
17. scrape diagnostics summary endpoint (with timeline option)
18. job-matching audit json/csv endpoints
19. scrape retry endpoint guard (`completed` run retry rejection)
20. scrape heartbeat callback + run progress persistence
21. transition guard for invalid run lifecycle state changes

## Recovery Tips

1. If scrape callbacks fail, replay worker dead letters:
   - `pnpm --filter worker callbacks:replay`
2. If smoke fails from startup race, re-run `pnpm smoke:e2e` after services are healthy.
3. If local tests hit throttling, reduce request rate or wait for throttle window reset.
4. If document uploads fail in FE:
   - check `GET /api/documents/upload-health`
   - inspect `GET /api/documents/:id/events` timeline for failure stage and error code
   - correlate with API `traceId` in `logs/error.log`

## Change Workflow

1. Implement feature in smallest testable slice.
2. Run package-level tests/build.
3. Run `pnpm smoke:e2e`.
4. Update:
   - `docs/PROJECT_STATE.md`
   - `docs/ROADMAP.md`
   - `docs/DECISIONS.md` (if architecture/contracts changed)

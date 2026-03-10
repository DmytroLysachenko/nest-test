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

## Database Portability

1. The app is provider-agnostic and only requires a valid PostgreSQL `DATABASE_URL`.
2. Supported deployment targets by configuration:
   - Neon serverless Postgres
   - Google Cloud SQL (PostgreSQL)
   - Self-hosted PostgreSQL
3. Keep provider-specific details in env/secrets only (host, SSL params, credentials).
4. Do not commit real DB credentials into repo-tracked files.

## Local Against Production DB

1. Set the same production `DATABASE_URL` in:
   - `apps/api/.env`
   - `apps/worker/.env` (if worker DB features are used)
   - `packages/db/.env` (for migrations/seeds)
2. Run migrations explicitly:
   - `pnpm --filter @repo/db migrate`
3. Avoid running demo/e2e seeds against production database.

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
   - `WORKER_CALLBACK_OIDC_AUDIENCE` (optional OIDC audience for worker callback auth)
   - `WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL` (optional expected worker service account email claim)
   - `WORKER_TASK_PROVIDER` (`http` or `cloud-tasks`, must be `cloud-tasks` in production)
   - `WORKER_TASKS_PROJECT_ID` / `WORKER_TASKS_LOCATION` / `WORKER_TASKS_QUEUE` (required for `cloud-tasks` mode)
   - `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL` (optional OIDC auth to worker `/tasks`)
   - `WORKER_TASKS_OIDC_AUDIENCE` (optional explicit worker OIDC audience)
   - `SCHEDULER_AUTH_TOKEN` (internal scheduler auth for `/api/job-sources/schedule/trigger`)
   - `OPS_INTERNAL_TOKEN` (internal scheduler auth for `/api/ops/reconcile-stale-runs`)
2. Worker:
  - `WORKER_MAX_BODY_BYTES` (example: `262144`)
  - `WORKER_ALLOWED_ORIGINS` (explicit CORS allowlist; no `*` in production)
  - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
  - `WORKER_CALLBACK_RETRY_JITTER_PCT`
  - `WORKER_HEARTBEAT_INTERVAL_MS`
  - `QUEUE_PROVIDER` (`local` or `cloud-tasks`)
  - `TASKS_AUTH_TOKEN` (optional if OIDC is used)
  - `TASKS_SERVICE_ACCOUNT_EMAIL` (required when using Cloud Tasks OIDC)
  - `TASKS_OIDC_AUDIENCE` (optional explicit ID token audience; defaults to `TASKS_URL`)
  - `WORKER_CALLBACK_OIDC_AUDIENCE` (optional OIDC audience used for worker -> API callbacks)

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
   - Optional deterministic mode for CI/external-source instability: `SMOKE_FORCE_CALLBACK=true pnpm smoke:e2e`
   - Optional worker no-op accept mode (useful in CI): `WORKER_SMOKE_ACCEPT_ONLY=true`

## Local Git Gates

1. `pre-commit`
   - Runs `pnpm verify:precommit`
   - Current behavior: `pnpm exec lint-staged --no-stash`
   - Purpose:
     - only staged-file ESLint/Prettier cleanup
     - avoid broad workspace validation on every small commit
2. `pre-push`
   - Runs `pnpm verify:prepush`
   - Current behavior:
     - `pnpm lint:fix:check`
     - `pnpm --filter @repo/db build`
     - `pnpm check-types`
     - targeted API auth/env tests
     - worker tests
     - API + worker builds
     - web unit tests
     - web Playwright e2e
     - web UX gate
   - Purpose:
     - catch the same class of failures that previously slipped to CI:
       - autofix-required lint drift
       - DB DTS/build regressions
       - workspace-summary mock drift in e2e
       - frontend route/integration regressions

## Why CI Caught Issues After Push

1. We previously bypassed hooks with `--no-verify` when local `lint-staged` was failing.
2. The old `pre-push` command was too narrow:
   - no lint autofix verification
   - no DB package build
   - no web unit tests
   - no Playwright e2e
   - no UX gate
3. CI ran broader validation than local push checks, so regressions surfaced only after push.

## Hook Bypass Policy

1. Do not use `--no-verify` for routine commits or pushes.
2. If a hook itself is broken and bypass is unavoidable:
   - fix the hook in the same branch before merge
   - run `pnpm verify:prepush` manually before pushing again
3. For cross-service workflow changes, still run `pnpm smoke:e2e` before merge even if `pre-push` passes.

## CI Branch Protection

1. Require passing checks before merge:
   - `CI Verify / lint`
   - `CI Verify / typecheck`
   - `CI Verify / test-build`
   - `CI Verify / web-e2e` (recommended required on `master`; advisory on PRs)
   - `Smoke Gate / smoke`
   - `Smoke Gate` provisions local Postgres, runs migrations, starts API/worker/web, then runs `scripts/smoke-e2e.ps1`.
2. For release promotions:
   - `Release Candidate / build-and-validate` must pass
   - production promotion is manual via `Promote To Prod`

## GCP Release/Promotion Variables

Canonical source for deployment/runtime values is:

- `docs/GCP_DEPLOY_MATRIX.md`

Configure repository/environment variables:

1. `vars.GCP_PROJECT_ID`
2. `vars.GCP_REGION`
3. `vars.GAR_REPOSITORY`
4. `vars.GCP_API_SERVICE`
5. `vars.GCP_WORKER_SERVICE`
6. `vars.GCP_WEB_SERVICE`
7. `vars.GCP_API_BASE_URL`
8. `vars.GCP_WORKER_BASE_URL`
9. `vars.GCP_WEB_BASE_URL`

Configure repository/environment secrets:

1. `secrets.GCP_WORKLOAD_IDENTITY_PROVIDER`
2. `secrets.GCP_DEPLOYER_SERVICE_ACCOUNT`

## Cloud Run Runtime Contract

For exact variable-level mapping and secret sources, use:

- `docs/GCP_DEPLOY_MATRIX.md`

1. API:
   - `PORT` is provided by Cloud Run (app already binds from env).
   - `ALLOWED_ORIGINS` must be explicit in production (no `*`).
   - `WORKER_TASK_PROVIDER=cloud-tasks` for production enqueue path.
   - `WORKER_TASKS_PROJECT_ID` / `WORKER_TASKS_LOCATION` / `WORKER_TASKS_QUEUE` must point to the worker task queue.
   - `WORKER_TASK_URL` must be worker Cloud Run `/tasks` endpoint (https).
2. Worker:
   - `QUEUE_PROVIDER=cloud-tasks` in production mode.
   - Worker binds to Cloud Run `PORT` when present; local fallback is `WORKER_PORT`.
   - Recommended service env: `WORKER_PORT=4001` for local only, `PORT` from Cloud Run in production.
   - Configure one auth mode for `/tasks`:
     - shared bearer token: `TASKS_AUTH_TOKEN` + API `WORKER_AUTH_TOKEN`
     - OIDC token: `TASKS_SERVICE_ACCOUNT_EMAIL` + API `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL`
3. Web:
   - Production start binds `0.0.0.0` and reads `PORT` (Cloud Run compatible).
   - `NEXT_PUBLIC_API_URL` must point to deployed API base URL (with `/api` suffix).
   - `NEXT_PUBLIC_ENABLE_TESTER=false` in production.

## First Production Rollout Checklist

1. Merge to main and ensure `CI Verify` + `Smoke Gate` are green.
2. Create release tag:
   - `git tag rc-YYYYMMDD-01`
   - `git push origin rc-YYYYMMDD-01`
3. Wait for `Release Candidate / build-and-validate` to publish images.
4. Run `Promote To Prod` with full 40-char release SHA.
5. Validate health via workflow post-deploy verify.
6. Run smoke against deployed URLs:
   - `API_BASE_URL=<api-url> WORKER_BASE_URL=<worker-url> WEB_BASE_URL=<web-url> SMOKE_SKIP_SEED=true pnpm smoke:e2e`

## Web Entry Routes

1. Main dashboard: `/`
2. Guided profile onboarding: `/onboarding`
3. Internal endpoint tester (dev flag): `/tester`
4. Admin ops console: `/ops`
5. Admin ops metrics: `GET /api/ops/metrics` (supports optional `windowHours` query)
6. Admin callback events listing: `GET /api/ops/scrape/callback-events`
7. Admin callback events export: `GET /api/ops/scrape/callback-events/export.csv`
8. Admin API request events listing: `GET /api/ops/api-request-events`
9. Admin dead-letter replay trigger: `POST /api/ops/scrape/callbacks/replay`
10. Admin stale-run reconcile: `POST /api/ops/scrape/runs/:id/reconcile`
11. Internal bulk stale-run reconcile: `POST /api/ops/reconcile-stale-runs`
11. Job source health summary: `GET /api/job-sources/sources/health`
12. Job source run export: `GET /api/job-sources/runs/export.csv`
13. Job match audit export: `GET /api/job-matching/audit/export.csv`
14. Document diagnostics summary: `GET /api/documents/diagnostics/summary`
15. Retry failed scrape run: `POST /api/job-sources/runs/:id/retry`
16. Worker heartbeat callback (internal): `POST /api/job-sources/runs/:id/heartbeat`
17. Document extraction retry: `POST /api/documents/:id/retry-extraction`
18. Retry all failed document extractions: `POST /api/documents/retry-failed`
19. Scrape preflight: `GET /api/job-sources/preflight`
20. User schedule trigger-now: `POST /api/job-sources/schedule/trigger-now`
21. Notebook summary: `GET /api/job-offers/summary`
22. Notebook bulk follow-up update: `POST /api/job-offers/pipeline/bulk-follow-up`

## Smoke Coverage (Current)

`smoke:e2e` verifies:

1. fixture seeding
2. API/worker/web health
3. auth login + refresh rotation
4. profile-input endpoints
5. onboarding draft CRUD endpoints
6. career-profile endpoints
7. workspace summary endpoint
8. workspace recovery guidance fields (`readinessBreakdown`, `blockerDetails`, `recommendedSequence`)
9. document retry-failed recovery endpoint
10. denormalized `career-profiles/search-view`
11. deterministic job matching
12. schedule read/update + scrape preflight
13. scrape enqueue + completion
14. notebook summary read model
15. notebook status/meta/history/score actions
16. worker + callback flow with retry-safe completion path
17. notebook ranking mode contract (`strict` + `approx`)
18. scrape diagnostics endpoint for completed run
19. document upload-health endpoint
20. document diagnostics summary endpoint
21. scrape diagnostics summary endpoint (with timeline option)
22. job-matching audit json/csv endpoints
23. scrape retry endpoint guard (`completed` run retry rejection)
24. scrape heartbeat callback + run progress persistence
25. schedule trigger-now path
26. transition guard for invalid run lifecycle state changes

## Recovery Tips

1. If scrape callbacks fail, replay worker dead letters:
   - `pnpm --filter worker callbacks:replay`
2. `pnpm smoke:e2e` now waits for `/health` endpoints, but local API/worker/web processes still need to be started before the readiness probes can succeed.
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
   - `docs/SPRINT_PLAN.md` when future sprint sequencing changes materially
   - `docs/DECISIONS.md` (if architecture/contracts changed)

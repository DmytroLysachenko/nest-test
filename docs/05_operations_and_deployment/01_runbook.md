# Runbook

Day-to-day engineering runbook for local development and verification.

Canonical environment inventory:

- `docs/05_operations_and_deployment/05_env_matrix.md`

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

## Production Support Toolkit

1. Production debugging is read-only by default.
2. Use committed API support endpoints plus local-only support scripts for direct Neon reads.
3. Keep production support config only in `.support-local/support.config.json` and never commit it.
4. Use a dedicated read-only production `DATABASE_URL`, not the main runtime credential.
5. Support scripts must never execute `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `TRUNCATE`, `DROP`, or `CREATE`.
6. Main local workflow:
   - `pnpm support:bundle --recipe scrape-incident --run-id <run-id>`
   - `pnpm support:bundle --recipe user-incident --user-id <user-id>`
   - `pnpm support:bundle --recipe correlation --trace-id <trace-id>`
7. Generated incident bundles are written to `.support-local/output/` and are safe to attach to a Codex session if they do not contain secrets you do not want to share.
8. For scraper-stage attribution, prefer DB-backed forensic endpoints before digging through raw worker logs:
   - `GET /api/job-sources/runs/:id/forensics`
   - `GET /api/ops/support/scrape-runs/:id/forensics`
   - `GET /api/ops/support/scrape-runs/:id/forensics/export.csv`
9. For access-control incidents, use:
   - `GET /api/ops/authorization-events`
   - `GET /api/ops/authorization-events/export.csv`
   - `GET /api/user/admin/users/:id/role`

## Neon Migration Recovery

1. If an expected table is missing in Neon, first confirm the API and `packages/db/.env` point at the same Neon project and branch.
2. Run migrations against that exact database:
   - `pnpm --filter @repo/db migrate`
3. Verify migration state in Neon SQL editor:
   ```sql
   select * from drizzle.__drizzle_migrations order by created_at desc;
   select to_regclass('public.api_request_events');
   ```
4. `public.api_request_events` should resolve to `api_request_events`.
5. If `/health` reports `required_tables` as down, the active database is missing required operational tables and must be migrated before relying on support diagnostics.

## Security/Capacity Env Knobs

1. API:
   - `GEMINI_MODEL` must use a supported Vertex model from the app allowlist. Legacy `gemini-1.5-*` values are rejected at boot.
   - `GCP_LOCATION` must use a supported Gemini serving region from the app allowlist.
   - `API_BODY_LIMIT` (example: `1mb`)
   - `SCRAPE_MAX_ACTIVE_RUNS_PER_USER` (per-user backpressure guard)
   - API CORS allowlist must not be `*` in production mode and should be derived from `GCP_WEB_BASE_URL`
   - `WORKSPACE_SUMMARY_CACHE_TTL_SEC` (cache ttl for workspace summary read model)
   - `JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS` (default summary window)
   - `SCRAPE_STALE_PENDING_MINUTES` (stale pending run timeout threshold)
   - `SCRAPE_STALE_RUNNING_MINUTES` (stale running run timeout threshold)
   - `SCRAPE_MIN_FRESH_CANDIDATES` (minimum fresh user-linkable offers required before cache/catalog reuse should satisfy a scrape)
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
  - `WORKER_ALLOWED_ORIGINS` (explicit CORS allowlist; no `*` in production; defaults to the public web origin when deploy input is unset)
  - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
  - `WORKER_CALLBACK_RETRY_JITTER_PCT`
  - `WORKER_HEARTBEAT_INTERVAL_MS`
  - `PRACUJ_LISTING_DELAY_MS`
  - `PRACUJ_LISTING_COOLDOWN_MS`
  - `PRACUJ_DETAIL_DELAY_MS`
  - `PRACUJ_BROWSER_FALLBACK_COOLDOWN_MS`
  - `PRACUJ_DETAIL_CACHE_HOURS`
  - `WORKER_OUTPUT_MODE`
  - `WORKER_OUTPUT_RETENTION_HOURS`
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
   - `pnpm --filter worker browser:probe`
   - Container-first browser probe:
     ```bash
     docker build -f apps/worker/Dockerfile -t nest-test-worker .
     docker run --rm nest-test-worker pnpm --filter worker browser:probe
     ```
   - Adaptive planner and listing-probe coverage runs in the same worker test suite.
3. Web checks:
   - `pnpm --filter web check-types`
   - `pnpm --filter web test`
   - `pnpm --filter web test:e2e`
5. Shared DB package:
   - `pnpm --filter @repo/db build`
4. End-to-end smoke:
   - `pnpm smoke:e2e`
   - Optional deterministic mode for CI/external-source instability: `SMOKE_FORCE_CALLBACK=true pnpm smoke:e2e`
   - Optional worker no-op accept mode (useful in CI): `WORKER_SMOKE_ACCEPT_ONLY=true`
   - Smoke now starts dedicated local API/worker/web processes on fallback ports and resets stale fixture scrape runs during seed.

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

## Scrape Incident Matrix

Use run diagnostics and events before reading raw service logs.

Interpretation rule:

1. A scrape run is healthy only when it produces useful offers or an intentionally empty outcome that is explained.
2. `COMPLETED` alone is not enough. Check `classifiedOutcome`, `story`, `silentFailure`, and notebook visibility.
3. Prefer artifact-backed diagnostics before guessing:
   - `diagnostics.artifacts.outputPath`
   - `diagnostics.artifacts.listing.htmlPath`
   - `diagnostics.artifacts.listing.dataPath`
   - `diagnostics.artifacts.rawPages.samplePaths`

1. `transportSummary.httpBlockedCount > 0` and `browserSummary.successfulLaunches > 0`
   - HTTP path was challenged, browser fallback recovered.
   - Expected result: run may still complete normally.
2. `transportSummary.httpBlockedCount > 0` and `browserSummary.failedLaunches > 0`
   - Source challenge plus browser bootstrap/runtime issue.
   - Check worker browser probe and Cloud Run revision/runtime drift.
3. `classifiedOutcome=detail_parse_gap` or `sourceQuality=degraded`
   - Listing succeeded but detail parsing/fetching was incomplete.
   - Notebook may still show degraded-source offers.
4. `progress.userInsertedOffers = 0` and notebook `hiddenByModeCount > 0`
   - Offers exist, but strict notebook mode hides them.
   - Switch to `approx` or `explore` for verification.
5. `sourceHealth.paused = true`
   - Automation is under backoff due to repeated source failures.
   - Manual runs remain the preferred debugging path.
6. `queryPlan.targetWindowMissed = true`
   - Adaptive acquisition could not land in the intended `20-40` listing window.
   - Review `queryPlan.attempts`, `selectedStage`, and scarcity flags before changing parser or matcher rules.
7. `stats.totalFound` stays low while the run is otherwise healthy
   - This is typically acquisition underreach, not worker failure.
   - Compare broad acquisition filters with post-scrape matching rules before tightening the notebook.
8. Reuse path returns few or zero new notebook links
   - Check fresh-candidate gating before blaming the worker.
   - Shared catalog or recent-run reuse now needs enough fresh user-linkable offers, not only enough gross candidate rows.
9. `silentFailure = true`
   - The run completed and found listings, but none became usable offers.
   - Treat this as a reliability problem, not as a healthy zero-result scrape.
10. `story.phase = partial` or `classifiedOutcome = partial_success`
   - The run returned usable offers, but source blocking or detail degradation reduced quality.
   - Review salvage-backed offers in notebook `approx` or `explore` before changing acquisition rules.

## Healthy Run, Low Output Checklist

Use this flow before changing scraper code randomly:

1. Check `diagnostics.queryPlan`.
   - If `targetWindowMissed=true` or `listingCountTooLow=true`, fix acquisition breadth first.
2. Check `diagnostics.productivity`.
   - `candidateOffers` low: acquisition or normalization is underperforming.
   - `candidateOffers` healthy but `userInsertedOffers` low: inspect matching and notebook strictness.
   - `candidateOffers` healthy but reuse still falls through to a new scrape: verify fresh-candidate gate and already-linked offer count.
   - `detailAttemptedCount` low with `stopReason=budget_reached`: tune detail budget or fetch ordering.
3. Check `hiddenByModeCount` and `degradedResultCount` in notebook responses.
   - Empty UI can still mean usable but strict-hidden or degraded results exist.
4. Check catalog quality reasons.
   - Prefer improving low-context/detail quality before widening notebook insertion rules.
5. Only after the above, change matcher penalties or salvage thresholds.

## Scrape Productivity Knobs

1. API:
   - `SCRAPE_ADAPTIVE_QUERY_TARGET_MIN`
   - `SCRAPE_ADAPTIVE_QUERY_TARGET_MAX`
2. Worker:
   - per-source detail budgets from adaptive planner output
   - transport policy (`http-only`, `http-first`, `hybrid`, `browser-first`)
3. Debugging signals to compare after a deploy:
   - `queryPlan.selectedStage`
   - `queryPlan.selectedCount`
   - `productivity.acceptanceRatio`
   - `productivity.insertionRatio`
   - `browserSummary.failureReason` when fallback was needed

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
   - `CI Verify / web-e2e` heavy validation on `dev`, `master`, and pull requests
   - `Smoke Gate / smoke`
   - `Smoke Gate` provisions local Postgres, runs migrations, starts API/worker/web, then runs `scripts/smoke-e2e.ps1`.
2. For release promotions:
   - `Release Candidate / build-and-validate` must pass
   - production promotion is manual via `Promote To Prod`

## GCP Release/Promotion Variables

Canonical source for deployment/runtime values is:

- `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md`

Configure repository/environment variables:

1. `vars.GCP_PROJECT_ID`
2. `vars.GCP_REGION`
3. `vars.GAR_REPOSITORY`
4. `vars.GCP_API_SERVICE`
5. `vars.GCP_WORKER_SERVICE`
6. `vars.GCP_WEB_SERVICE`
7. `vars.GCS_BUCKET`
8. `vars.GOOGLE_OAUTH_CLIENT_ID`
9. `vars.GEMINI_MODEL`

Configure repository/environment secrets:

1. `secrets.GCP_WORKLOAD_IDENTITY_PROVIDER`
2. `secrets.GCP_DEPLOYER_SERVICE_ACCOUNT`

## Cloud Run Runtime Contract

For exact variable-level mapping and secret sources, use:

- `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md`

1. API:
   - `PORT` is provided by Cloud Run (app already binds from env).
   - API `ALLOWED_ORIGINS` must stay explicit in production (no `*`) and should include the public web origin.
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
5. Download and inspect workflow artifacts:
   - `release-candidate-<sha>` metadata
   - `promote-release-metadata`
   - `promote-verify-summary`
6. Validate health via workflow post-deploy verify.
7. Run smoke against deployed URLs:
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
12. Admin support overview: `GET /api/ops/support/overview`
13. Admin scrape incident bundle: `GET /api/ops/support/scrape-runs/:id`
14. Admin user incident bundle: `GET /api/ops/support/users/:id`
15. Admin support correlation lookup: `GET /api/ops/support/correlate`
16. Admin schedule execution timeline: `GET /api/ops/support/schedule-events`
17. Soft delete current account: `DELETE /api/user`
18. Job source health summary: `GET /api/job-sources/sources/health`
19. Job source run export: `GET /api/job-sources/runs/export.csv`
20. Job match audit export: `GET /api/job-matching/audit/export.csv`
21. Document diagnostics summary: `GET /api/documents/diagnostics/summary`
22. Retry failed scrape run: `POST /api/job-sources/runs/:id/retry`
23. Worker heartbeat callback (internal): `POST /api/job-sources/runs/:id/heartbeat`
24. Document extraction retry: `POST /api/documents/:id/retry-extraction`
25. Retry all failed document extractions: `POST /api/documents/retry-failed`
26. Scrape preflight: `GET /api/job-sources/preflight`
27. User schedule trigger-now: `POST /api/job-sources/schedule/trigger-now`
28. Notebook summary: `GET /api/job-offers/summary`
29. Notebook bulk follow-up update: `POST /api/job-offers/pipeline/bulk-follow-up`
30. Scrape run event timeline: `GET /api/job-sources/runs/:id/events`
31. Year plan doc: `docs/03_plans_and_roadmaps/03_year_plan.md`

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
2. For stale or silently failed scrapes, inspect the lifecycle in this order:
   - `GET /api/ops/support/scrape-runs/:id`
   - `GET /api/ops/support/schedule-events?sourceRunId=<run-id>`
   - `GET /api/job-sources/runs/:id`
   - `GET /api/job-sources/runs/:id/diagnostics`
   - `GET /api/job-sources/runs/:id/events`
   - then correlate the same `traceId` across API, worker, and DB support bundle output
   - `transportSummary` in diagnostics now shows whether the run stayed on HTTP, escalated to browser fallback, whether browser launch succeeded, and the fallback reasons that triggered escalation
3. For scheduler-specific failures, inspect:
   - `GET /api/ops/support/overview`
   - `GET /api/ops/support/schedule-events?userId=<user-id>`
   - `GET /api/ops/support/users/:id`
4. `pnpm smoke:e2e` now waits for `/health` endpoints and auto-starts dedicated local API/worker/web processes when needed.
5. Admin ops endpoints are skip-throttled and the web ops page should use `GET /api/ops/support/overview` as its primary payload instead of parallel polling.
6. Internal worker endpoints for scrape completion, heartbeat, and schedule trigger are also throttle-exempt. New `429` responses there usually mean stale deploy/runtime drift rather than expected protection.
7. If local tests hit throttling, reduce request rate or wait for throttle window reset.
8. To reproduce Chromium startup issues before deploying, run the browser bootstrap probe in the same Linux/containerized worker environment first:
   - `pnpm --filter worker browser:probe`
   - optional startup probe: `WORKER_BROWSER_PROBE_ON_START=true`
   - prefer local worker Docker/container repro before debugging host-Windows behavior
9. If the notebook is empty after a completed scrape, check the notebook response metadata before blaming the scraper:
   - `hiddenByModeCount > 0` means offers exist but strict mode filtered them out
   - `job_source_runs.progress.userInsertedOffers` shows how many notebook rows were linked for that run
7. If document uploads fail in FE:
   - check `GET /api/documents/upload-health`
   - inspect `GET /api/documents/:id/events` timeline for failure stage and error code
   - correlate with API `traceId` in `logs/error.log`
10. For scrape incidents, check shared-catalog health before forcing another worker run:
   - `GET /api/ops/catalog/summary`
   - `POST /api/ops/catalog/rematch/users/:id`
   - if fresh accepted offers already exist, prefer rematch over another scrape
11. If automated scrapes stop firing, inspect source-health pause state before changing scheduler config:
   - preflight warning `source-health-backoff`
   - `GET /api/ops/catalog/summary`
   - recent `job_source_runs.failure_type` distribution in support bundle output
12. For production deploy/rollback evidence, retain these workflow artifacts with incident notes:
   - `deployment-release-metadata` or `promote-release-metadata`
   - `deploy-verify-summary` or `promote-verify-summary`
   - `rollback-summary`
13. If career-profile generation fails with an AI provider error:
   - check API `/health` for `required_tables`
   - confirm `GEMINI_MODEL` is not a retired `gemini-1.5-*` value
   - confirm `GCP_LOCATION` and Vertex project access match the runtime environment
   - retry only after config/access is corrected; `AI_CONFIGURATION_ERROR` is not a transient scrape-style retry condition

## Change Workflow

1. Implement feature in smallest testable slice.
2. Run package-level tests/build.
3. Run `pnpm smoke:e2e`.
4. Update:
   - `docs/01_project_context/02_project_state.md`
   - `docs/03_plans_and_roadmaps/01_roadmap.md`
   - `docs/03_plans_and_roadmaps/02_sprint_plan.md` when future sprint sequencing changes materially
   - `docs/04_architecture_and_data/01_decisions.md` (if architecture/contracts changed)

# Debugging Playbook

Last updated: 2026-04-24

## Purpose

This chapter is the durable debugging reference for the repository.

It is not a logbook of past incidents. It is the place to record:

- how to approach failures
- where the most fragile or high-friction areas are
- which tools and docs to use first
- what usually goes wrong in local, CI, and production flows
- which assumptions should be checked before changing code

Use this document when debugging:

- `pnpm smoke:e2e`
- API or worker scrape lifecycle issues
- callback, retry, replay, or stale-run behavior
- CI drift after frontend or contract changes
- local vs CI vs production mismatches

## Debugging Principles

1. Start from the current contract, not an older assumption.
2. Confirm whether the failure is product behavior, test drift, or environment drift.
3. Prefer correlation ids, persisted state, and support surfaces over guesswork.
4. Do not treat rate limits as root cause until request cadence is understood.
5. For scrape flows, separate:
   - enqueue acceptance
   - worker execution
   - callback finalization
   - notebook visibility
   - diagnostics richness
6. When smoke fails, verify whether the failure is on:
   - fresh worker execution path
   - DB reuse path
   - catalog rematch path
7. For frontend failures, first confirm whether the app shell, auth bootstrap, or route protection changed before editing selectors.

## Fast Triage Order

1. Reproduce locally with the smallest relevant command.
2. Read the failing assertion or terminal state exactly.
3. Identify the owning surface:
   - `web` unit/e2e
   - API unit/integration
   - worker
   - smoke cross-service flow
4. Verify the runtime path with the closest stable source of truth:
   - API response
   - DB state
   - support/ops endpoint
   - worker/API logs
5. Only then decide whether to fix:
   - implementation
   - test expectations
   - smoke orchestration
   - docs/contracts

## High-Risk Debug Areas

### 1. Smoke E2E

`pnpm smoke:e2e` is the highest-friction debugging surface because it mixes:

- DB migrations and seeding
- API auth
- worker dispatch
- callback finalization
- notebook visibility
- diagnostics and ops assertions
- throttling and idempotency rules

Common failure classes:

- route wired to a lifecycle-only path instead of the full business-finalization path
- smoke asserting old response shape after API evolution
- smoke asserting narrative copy fields like `story.summary` instead of stable structural fields such as `story.phase`, `usefulness.status`, or diagnostics counters
- reuse-backed scrape being treated like a fresh worker run
- incremental-failure scenario accidentally hitting duplicate-intent or reuse protection
- polling loops ignoring `429` backoff windows
- diagnostics assertions expecting fields that only exist on richer worker paths
- local repo-owned dev processes holding ports or lockfiles used by smoke and Playwright boot

Required mindset:

- treat smoke as an orchestration test, not a single-surface test
- debug the exact stage first
- confirm whether the path was `reused`, `accepted`, or `catalog-rematched`
- check process and lock interference before assuming an application regression

### 1.1 Local Process and Lock Interference

Frequent traps:

- a repo-local `next dev` process keeps `apps/web/.next/dev/lock`
- repo-local smoke services are already bound to `3100`, `3102`, or `4101`
- Playwright pre-push boot fails because the web app never starts on `3002`
- a previous smoke run leaves local worker or web processes alive

Typical signatures:

- `Unable to acquire lock at apps/web/.next/dev/lock`
- Playwright `net::ERR_CONNECTION_REFUSED` against `http://localhost:3002`
- smoke starting new local services but reusing stale repo-owned processes

Fast checks:

- inspect repo-local `node` processes and their command lines
- check whether `apps/web/.next/dev/lock` exists
- confirm whether `3100`, `3102`, `4101`, and `3002` are already occupied by repo-local processes

Remediation:

- stop the repo-owned `next dev`, worker, or test-server processes
- remove the stale lockfile only after confirming the owning process is gone
- rerun the blocked command after clearing the local process state

### 2. Scrape Enqueue and Run State

Frequent traps:

- duplicate-intent protection returning `429`
- `forceRefresh` bypassing reuse but not bypassing all idempotency windows immediately
- `PENDING` vs `RUNNING` vs `COMPLETED` differences between acceptance, execution, and callback timing
- Cloud Scheduler HTTP deadline shorter than Cloud Run cold-start + handler latency, producing scheduler-visible `504 DEADLINE_EXCEEDED` even when schedule events and run creation succeed

Check first:

- `POST /api/job-sources/scrape` response payload
- `status`
- `reusedFromRunId`
- `inserted`
- `totalOffers`
- `GET /api/job-sources/runs/:id`

For scheduled automation specifically:

- compare Cloud Scheduler execution logs with Cloud Run request logs for `/api/job-sources/schedule/trigger`
- compare scheduler-visible outcome with `scrape_schedule_events`
- if Scheduler shows `504` but DB shows `schedule_enqueue_succeeded`, treat scheduler deadline/cold-start as root cause before changing due-schedule pickup logic

### 2.1 Reuse vs Fresh Run Checklist

Before changing scrape, smoke, or diagnostics logic, identify which path actually happened:

- fresh worker run
- DB reuse
- catalog rematch
- force-refresh bypass

Why this matters:

- fresh runs can produce richer worker diagnostics and callback-side detail
- reuse-backed runs may legitimately skip worker execution and callback generation
- smoke assertions that require fresh-run-only fields will fail on valid reuse paths
- duplicate-intent and rate-limit behavior often looks like scrape failure unless the reuse path is checked first

Minimum fields to inspect:

- enqueue response `accepted`
- enqueue response `reusedFromRunId`
- final run `status`
- diagnostics/usefulness counts
- whether a worker task was actually received

### 3. Worker Callback Finalization

Frequent traps:

- callback endpoint auth/signature mismatch
- callback hitting the wrong implementation path
- duplicate callback ids becoming idempotent no-ops
- terminal run already finalized before a later callback arrives
- worker/API DTO drift under `ValidationPipe` whitelist enforcement
- incremental batch ingest rejecting fields that final catalog persistence expects to keep
- worker diagnostics exposing top-level fields that only exist in nested `stageMetrics.fetch`

Check first:

- controller wiring
- callback response code
- run status transition in DB
- `job_source_callback_events`
- `job_source_run_events`

High-signal incident signature:

- worker execution reaches `SCRAPE_COMPLETED`
- `scrape_execution_events` show `OFFER_BATCH_INGEST_DEAD_LETTERED` and `CALLBACK_REJECTED`
- `job_source_callback_events` remain empty
- notebook stays empty because API never accepted the callback envelope

Fast contract check:

- compare worker payload builders in `apps/worker/src/jobs/scrape-job.ts`
- compare API DTOs in `apps/api/src/features/job-sources/dto/*`
- validate suspected payloads with the same `whitelist` and `forbidNonWhitelisted` settings used by `apps/api/src/bootstrap.ts`

### 4. Notebook Visibility vs Data Persistence

A recurring confusion point:

- persisted offers can exist even when strict-mode notebook UI looks empty
- reuse can legitimately produce `linkedOffers = 0` for the new request because the notebook already contains the rows
- failed incremental scrape scenarios may preserve offers even if the final run status is `FAILED`

Check first:

- `user_job_offers`
- `job_offers`
- `origin`
- `sourceRunId`
- notebook summary/focus endpoints
- approx vs strict offer list

### 5. Frontend Auth and Route Bootstrap

Frequent traps:

- tests only mocking local storage while the app now reads server cookies
- page shells changing after layout or route-guard refactors
- copy/header changes invalidating brittle selectors

Check first:

- whether auth is cookie-driven on the server path
- whether the route is rendering the intended private surface
- whether the test is asserting product text or internal scaffolding text

### 6. Diagnostics Payload Assumptions

Not every run produces the same richness of diagnostics.

In particular:

- fresh worker runs tend to expose richer stage metrics
- reuse-backed runs may have only lightweight summaries
- smoke and tests should assert stable contract fields first, then richer fields only where the path guarantees them

Endpoint ownership:

- `/api/job-sources/runs/:id/diagnostics` is the rich business diagnostics contract used by smoke and product/support surfaces
- `/api/job-sources/runs/:id/events` is the persisted event timeline
- `/api/job-sources/runs/:id/forensics` is the lower-level investigation surface

Do not swap these responsibilities casually. If controller wiring drifts, smoke may still get a `200` while returning the wrong payload shape.

Prefer asserting:

- ids
- lifecycle state
- enums
- counters
- usefulness and notebook visibility summaries

Avoid relying on:

- narrative copy fields such as `story.summary`
- richer worker-only metrics unless the path guarantees a fresh worker run

## Recommended Debug Workflow By Surface

### Web Unit or E2E

1. Confirm current route renders the expected shell.
2. Check whether auth bootstrap changed.
3. Compare selector text with current user-facing copy.
4. Prefer stable roles/labels/test ids over decorative text.
5. If UI changed intentionally, update tests to reflect the product, not the old wording.

### API/Worker Scrape Bug

1. Check enqueue response.
2. Check run state.
3. Check callback route and result.
4. Check persisted offers.
5. Check notebook linking.
6. Check diagnostics only after state and persistence are confirmed.

### Smoke Failure

1. Identify the exact stage from script output.
2. Inspect whether the run path was:
   - worker execution
   - DB reuse
   - failed incremental scenario
3. Check for local process, port, and lock interference before changing code.
4. If polling is involved, inspect throttling and retry timing.
5. If incremental-failure flow is involved, verify:
   - unique request id
   - `forceRefresh`
   - failed callback finalization
   - retained offer visibility
6. If diagnostics assertions fail, compare against the current DTO and actual runtime payload before changing implementation.

## Known Fragile Patterns To Check Before Coding

Before changing scrape, notebook, or smoke-related code, check these first:

1. Is this path allowed to reuse existing data?
2. Will idempotency reject repeated requests with the same intent fingerprint?
3. Is the code path using the full business service or only a lifecycle helper?
4. Does this assertion depend on strict-mode visibility instead of underlying persistence?
5. Is this diagnostics field guaranteed on all run paths, or only worker-heavy ones?
6. Is the test using current user-facing copy?
7. Is auth in this flow server-cookie based, client-storage based, or both?

## Project-Specific Debugging Tools

Use these in order of signal:

1. `pnpm smoke:e2e`
2. targeted `jest` or `vitest`
3. Playwright e2e for current UI behavior
4. support/ops endpoints
5. DB read queries
6. local API/worker logs
7. Cloud Run logs and deploy verification

Operational details, production URLs, and support commands remain in:

- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/05_operations_and_deployment/03_prod_deploy_guide.md`
- `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md`
- `docs/05_operations_and_deployment/05_env_matrix.md`

## Documentation Rules For Future Debugging Work

When a debugging session reveals a reusable lesson:

- add durable guidance here
- update the runbook if the lesson affects operations or recovery
- update feature or architecture docs if contracts changed
- do not dump temporary incident notes into `AGENTS.md`
- do not keep only implicit knowledge inside smoke assertions or tests

## Minimal Debugging Checklist

Before finishing a bugfix in a fragile area, confirm:

- the actual runtime path is understood
- the fix targets the root cause, not just the symptom
- tests reflect current product behavior
- smoke was updated if the cross-service contract changed
- the relevant doc now contains the durable lesson

# E2E Debugging Guide

Practical debugging guide for production and cross-service scrape incidents.

Use this document when:

- scrape runs are stuck in `PENDING` or `RUNNING`
- worker callbacks are not landing
- production deploys look healthy but real scrapes fail
- frontend flow works partially but the end-to-end workflow breaks

## Current Production References

GCP project:

- `job-seeking-service`

Region:

- `europe-west1`

Cloud Run services:

- API service: `job-seek-api`
- Worker service: `job-seek-worker`
- Web service: `job-seek-web`

Public production URLs:

- API: `https://job-seek-api-ouv46sopeq-ew.a.run.app`
- Worker: `https://job-seek-worker-ouv46sopeq-ew.a.run.app`
- Web: `https://job-seek-web-842434374136.europe-west1.run.app`

Primary runtime endpoints:

- API health: `GET https://job-seek-api-ouv46sopeq-ew.a.run.app/health`
- Worker health: `GET https://job-seek-worker-ouv46sopeq-ew.a.run.app/health`
- Worker task ingress: `POST https://job-seek-worker-ouv46sopeq-ew.a.run.app/tasks`
- Worker callback target: `POST https://job-seek-api-ouv46sopeq-ew.a.run.app/api/job-sources/complete`

## Incident Triage Order

1. Check API and worker health.
2. Inspect the user-visible run in API.
3. Pull the run timeline and callback history.
4. Check worker Cloud Run logs for the same `sourceRunId`, `traceId`, or `requestId`.
5. Pull API request/error events for the same correlation ids.
6. Query DB-backed support tables if API surfaces are incomplete.
7. Replay dead letters or retry failed runs only after the root cause is understood.
8. Read run diagnostics before assuming the scraper failed:
   - `transportSummary` shows HTTP vs browser fallback path and fallback reasons
   - `progress.userInsertedOffers` shows whether notebook rows were linked even when the UI looks empty in strict mode

## Fast Checks

Health:

```bash
curl https://job-seek-api-ouv46sopeq-ew.a.run.app/health
curl https://job-seek-worker-ouv46sopeq-ew.a.run.app/health
```

Production deployment verification:

```bash
API_BASE_URL=https://job-seek-api-ouv46sopeq-ew.a.run.app \
WORKER_BASE_URL=https://job-seek-worker-ouv46sopeq-ew.a.run.app \
WEB_BASE_URL=https://job-seek-web-842434374136.europe-west1.run.app \
./scripts/verify-deployment.sh
```

Cross-service smoke against production:

```bash
API_BASE_URL=https://job-seek-api-ouv46sopeq-ew.a.run.app \
WORKER_BASE_URL=https://job-seek-worker-ouv46sopeq-ew.a.run.app \
WEB_BASE_URL=https://job-seek-web-842434374136.europe-west1.run.app \
SMOKE_SKIP_SEED=true \
pnpm smoke:e2e
```

## Repo Tools

### 1. Support Toolkit

Best first tool for production incidents.

Setup:

1. Copy `tools/support/support.config.example.json` into `.support-local/support.config.json`
2. Fill:
   - `apiBaseUrl`
   - `workerBaseUrl`
   - `apiBearerToken`
   - `databaseUrl` with a read-only production connection

Commands:

```bash
pnpm support:bundle --recipe scrape-incident --run-id <run-id>
pnpm support:bundle --recipe user-incident --user-id <user-id>
pnpm support:bundle --recipe correlation --trace-id <trace-id>
pnpm support:query --query-id run-by-id --run-id <run-id>
pnpm support:query --query-id run-events-by-run-id --run-id <run-id>
pnpm support:query --query-id callback-events-by-run-id --run-id <run-id>
pnpm support:query --query-id api-request-events-by-request-id --request-id <request-id>
pnpm support:query --query-id api-request-events-by-trace-id --trace-id <trace-id>
pnpm support:query --query-id recent-failed-runs
```

Use it for:

- scrape incident bundles
- correlation across API + DB
- latest failed runs
- request-level error events

### 2. Cloud Run Logs

Use `gcloud` for live service and revision diagnostics.

Describe services:

```bash
gcloud run services describe job-seek-api --region=europe-west1 --project=job-seeking-service
gcloud run services describe job-seek-worker --region=europe-west1 --project=job-seeking-service
gcloud run services describe job-seek-web --region=europe-west1 --project=job-seeking-service
```

Read recent worker logs:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="job-seek-worker"' \
  --project=job-seeking-service \
  --freshness=2d \
  --limit=200
```

Read recent API logs:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="job-seek-api"' \
  --project=job-seeking-service \
  --freshness=2d \
  --limit=200
```

Filter by run or request id:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="job-seek-worker" AND jsonPayload.sourceRunId="<run-id>"' \
  --project=job-seeking-service \
  --freshness=2d \
  --limit=100

gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="job-seek-worker" AND jsonPayload.requestId="<request-id>"' \
  --project=job-seeking-service \
  --freshness=2d \
  --limit=100
```

Use it for:

- missing Playwright/browser errors
- callback rejections
- dead-letter writes
- revision drift after deploy
- wrong env values on live services
- confirming browser bootstrap probe output after deploys

### 3. API Ops Endpoints

Use these when you have an authenticated admin/support token.

Most useful endpoints:

- `GET /api/ops/support/overview`
- `GET /api/ops/support/scrape-runs/:id`
- `GET /api/ops/support/scrape-runs/:id/forensics`
- `GET /api/ops/support/scrape-runs/:id/forensics/export.csv`
- `GET /api/ops/support/users/:id`
- `GET /api/ops/support/correlate`
- `GET /api/ops/support/schedule-events`
- `GET /api/ops/metrics`
- `GET /api/ops/scrape/callback-events`
- `GET /api/ops/api-request-events`
- `GET /api/ops/authorization-events`
- `GET /api/ops/authorization-events/export.csv`
- `POST /api/ops/scrape/callbacks/replay`
- `POST /api/ops/scrape/runs/:id/reconcile`
- `POST /api/ops/reconcile-stale-runs`

Use them for:

- incident bundles without direct DB access
- callback event inspection
- csv export of forensic timelines and access-control incidents
- stale run reconciliation
- support-grade summary views

### 4. User-Facing Scrape Endpoints

Useful when reproducing with a real user session:

- `POST /api/job-sources/scrape`
- `GET /api/job-sources/runs`
- `GET /api/job-sources/runs/:id`
- `GET /api/job-sources/runs/:id/diagnostics`
- `GET /api/job-sources/runs/:id/events`
- `GET /api/job-sources/runs/:id/forensics`
- `GET /api/job-sources/runs/diagnostics/summary`
- `GET /api/job-sources/sources/health`
- `POST /api/job-sources/runs/:id/retry`
- `GET /api/job-sources/preflight`
- `GET /api/job-sources/schedule`
- `PUT /api/job-sources/schedule`
- `POST /api/job-sources/schedule/trigger-now`

Use them for:

- confirming whether the API accepted the scrape
- checking if the run ever moved beyond `PENDING`
- understanding filter normalization and source diagnostics
- seeing whether the run stayed on HTTP or escalated to browser fallback through `transportSummary`

### 5. Worker Dead-Letter Recovery

CLI:

```bash
pnpm --filter worker callbacks:replay
```

HTTP:

```bash
curl -X POST https://job-seek-worker-ouv46sopeq-ew.a.run.app/callbacks/replay \
  -H "Authorization: Bearer <TASKS_AUTH_TOKEN>"
```

Use it only after verifying why callbacks failed. Replaying a bad payload into a still-broken target just requeues noise.

### 6. Local File Logs

Available in repo:

- API error log: `apps/api/logs/error.log`
- API info log: `apps/api/logs/info.log`

Useful local checks:

```bash
Get-Content apps/api/logs/error.log -Tail 100
Get-Content apps/api/logs/info.log -Tail 100
```

Use local logs for:

- reproductions against local stack
- checking request ids and trace ids before moving to prod

## DB Tables That Matter

These are the most useful support tables for scrape incidents:

- `job_source_runs`
- `job_source_run_events`
- `job_source_callback_events`
- `job_offers`
- `user_job_offers`
- `api_request_events`
- `scrape_schedule_events`

What each table tells you:

- `job_source_runs`: current run state, timestamps, `failure_type`, `trace_id`, `progress`
- `job_source_run_events`: lifecycle timeline, dispatch, heartbeat, callback transitions
- `job_source_callback_events`: accepted callback envelopes and replay metadata
- `job_offers`: shared catalog freshness, quality state, dedupe identity, last-seen/matched timestamps
- `user_job_offers`: whether offers reached the notebook through `SCRAPE`, `DB_REUSE`, or `CATALOG_REMATCH`
- `api_request_events`: API-side warnings and errors persisted for support/debugging
- `scrape_schedule_events`: scheduler pickup and enqueue timeline

## Common Failure Patterns

### Run stuck in `PENDING`

Check:

- `GET /api/job-sources/runs/:id/events`
- worker Cloud Tasks dispatch logs
- worker service health
- queue/auth config

Likely causes:

- worker task dispatch failed
- Cloud Tasks auth mismatch
- worker service unavailable

### Run stuck in `RUNNING` with no callback

Check:

- worker logs by `sourceRunId`
- `job_source_run_events`
- `job_source_callback_events`
- dead-letter directory or replay endpoint

Likely causes:

- scraper crashed mid-run
- callback target misconfigured
- worker browser/runtime dependency missing

### Callback returns `404`

Check:

- whether API saw the same `requestId`
- whether `WORKER_CALLBACK_URL` points to the API service, not an internal host fallback
- whether the run id exists in `job_source_runs`

Interpretation:

- if API never saw the request id, the worker posted to the wrong target
- if API saw it and returned 404, inspect `Job source run not found`

### Frequent `429 RATE_LIMITED`

Check:

- `api_request_events`
- frontend polling frequency
- `API_THROTTLE_LIMIT`
- ops page and dashboard query cadence

Interpretation:

- usually frontend polling or repeated support queries
- not usually the root cause of worker callback failures
- internal worker scrape callbacks and heartbeats are now throttle-exempt, so fresh `429` responses there usually indicate runtime drift or an old revision

### Fresh catalog but no new worker run

Check:

- `GET /api/job-sources/preflight`
- `GET /api/ops/catalog/summary`
- `POST /api/ops/catalog/rematch/users/:id`
- `user_job_offers.origin`

Interpretation:

- if preflight recommends rematch, the API should serve the request from catalog without queueing the worker
- if rematch inserts offers, the issue is notebook-linking or FE refresh, not scraping
- if catalog is stale or low-quality, investigate worker/source health next

### Scheduled scrape not enqueued

Check:

- `GET /api/job-sources/preflight`
- recent `job_source_runs.failure_type`
- `scrape_schedule_events`
- source health warnings in support bundle output

Interpretation:

- the scheduler now pauses automated scrapes when recent runs show clustered `parse`, `network`, `callback`, or `timeout` failures
- manual runs can still be triggered, but the pause is usually a source-health signal rather than a scheduler bug

## Current Known Production Incident

Observed on March 16, 2026:

- worker scrape failed because Playwright Chromium was missing in the deployed worker image
- worker heartbeat/callback requests returned `404 {"error":"Not Found"}`
- API never saw the worker request id
- production API had no explicit `WORKER_CALLBACK_URL`, so callback payload generation could fall back to `http://0.0.0.0:8080/api/job-sources/complete`, which is invalid for Cloud Run outbound callbacks

## Recommended Debug Workflow

1. Start with `pnpm support:bundle --recipe scrape-incident --run-id <run-id>`.
2. Read `job_source_runs`, `job_source_run_events`, and `job_source_callback_events`.
3. Pull worker Cloud Run logs using `sourceRunId` and `requestId`.
4. Confirm API saw the callback request id.
5. If API did not see it, inspect callback URL generation and deployed service env.
6. If API did see it, inspect `api_request_events` and API request logs.
7. If the failure involves browser fallback, run `pnpm --filter worker browser:probe` in the closest Linux/containerized environment before changing scraper logic.
8. Check whether fresh accepted catalog inventory already covers the user need before triggering another scrape.
9. If the notebook is empty, inspect strict-mode visibility:
   - `hiddenByModeCount > 0` means offers were ingested but filtered by notebook mode
   - `progress.userInsertedOffers` confirms whether the callback linked notebook rows
10. Only then decide between rematch, replay, retry, reconcile, or redeploy.

## Safe Recovery Actions

- Reconcile stale runs:
  - `POST /api/ops/scrape/runs/:id/reconcile`
  - `POST /api/ops/reconcile-stale-runs`
- Retry failed runs:
  - `POST /api/job-sources/runs/:id/retry`
- Trigger catalog rematch for a user:
  - `POST /api/ops/catalog/rematch/users/:id`
- Replay dead letters:
  - `pnpm --filter worker callbacks:replay`

Do not:

- replay dead letters before fixing callback destination/auth
- rerun smoke against prod while prod callback env is clearly wrong
- mutate production DB manually outside the read-only support workflow

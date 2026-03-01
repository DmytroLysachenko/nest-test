# Operations Runbook

This runbook documents core operational procedures for API + worker.

## Service Health

- API health: `GET /health`
- API readiness check (db + disk): `GET /health/test`
- Worker health (queue stats): `GET http://localhost:4001/health`

## Callback Security

If `WORKER_CALLBACK_SIGNING_SECRET` is enabled:

- worker sends `x-worker-signature` and `x-worker-timestamp`
- API validates timestamp tolerance via `WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC`
- callback payload should include `eventId` to prevent replay

Replay/idempotency events are stored in `job_source_callback_events`.

If `WORKER_CALLBACK_OIDC_AUDIENCE` is enabled in API:

- worker sends bearer ID token (Cloud Run service identity)
- API verifies token audience and optionally verifies caller email claim

## Dead-letter Recovery

CLI replay:

```bash
pnpm --filter worker callbacks:replay
```

HTTP replay endpoint (same auth as `/tasks`):

```bash
curl -X POST http://localhost:4001/callbacks/replay \
  -H "Authorization: Bearer <TASKS_AUTH_TOKEN>"
```

For Cloud Tasks OIDC mode, replay endpoint auth can also use a valid ID token
for the configured audience and service account.

## Queue Backpressure

Worker queue can be controlled via:

- `WORKER_MAX_CONCURRENT_TASKS`
- `WORKER_MAX_QUEUE_SIZE`
- `WORKER_TASK_TIMEOUT_MS`

When queue is full, worker returns `429` and API should retry later.

## Failed Run Retry

- User-triggered retry endpoint:
  - `POST /api/job-sources/runs/:id/retry`
- Constraints:
  - only run owner
  - only `FAILED` runs
  - creates a new run linked via `retry_of_run_id` (original run remains immutable)

## Recommended SLO Baseline (MVP)

- API availability: >= 99.5%
- Worker callback success rate: >= 99%
- Scrape run completion (without manual replay): >= 95%
- p95 API latency (non-LLM endpoints): <= 600ms

## Alert Thresholds (Initial)

- Heartbeat stale ratio (`runningWithoutHeartbeat / runningRuns`): alert at `> 0.25` for 5 min.
- Callback failed event ratio (`failedEvents / totalEvents`): alert at `> 0.10` for 10 min.
- Retry success rate: alert at `< 0.70` for 30 min.
- Scrape success rate in `/ops/metrics`: alert at `< 0.90` for 30 min.

## Incident Checklist

1. Confirm service health endpoints.
2. Check API logs for callback signature/token failures.
3. Check worker queue saturation (`/health` queue stats).
4. Replay dead-letter callbacks.
5. Re-run smoke test: `pnpm smoke:e2e`.
6. Verify release candidate artifact metadata (`ref`, `sha`, `created_at`) before promotion.

## Deployment Verification

After production promotion, run:

```bash
API_BASE_URL=<api-url> \
WORKER_BASE_URL=<worker-url> \
WEB_BASE_URL=<web-url> \
./scripts/verify-deployment.sh
```

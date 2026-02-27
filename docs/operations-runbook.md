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

## Incident Checklist

1. Confirm service health endpoints.
2. Check API logs for callback signature/token failures.
3. Check worker queue saturation (`/health` queue stats).
4. Replay dead-letter callbacks.
5. Re-run smoke test: `pnpm smoke:e2e`.

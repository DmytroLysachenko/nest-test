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
2. Worker:
   - `WORKER_MAX_BODY_BYTES` (example: `262144`)
   - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
   - `WORKER_CALLBACK_RETRY_JITTER_PCT`

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

## Smoke Coverage (Current)

`smoke:e2e` verifies:

1. fixture seeding
2. API/worker/web health
3. auth login + refresh rotation
4. profile-input endpoints
5. career-profile endpoints
6. denormalized `career-profiles/search-view`
7. deterministic job matching
8. scrape enqueue + completion
9. notebook status/meta/history/score actions
10. worker + callback flow with retry-safe completion path
11. notebook ranking mode contract (`strict` + `approx`)
12. scrape diagnostics endpoint for completed run
13. document upload-health endpoint

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

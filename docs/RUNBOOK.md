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

## Recovery Tips

1. If scrape callbacks fail, replay worker dead letters:
   - `pnpm --filter worker callbacks:replay`
2. If smoke fails from startup race, re-run `pnpm smoke:e2e` after services are healthy.
3. If local tests hit throttling, reduce request rate or wait for throttle window reset.

## Change Workflow

1. Implement feature in smallest testable slice.
2. Run package-level tests/build.
3. Run `pnpm smoke:e2e`.
4. Update:
   - `docs/PROJECT_STATE.md`
   - `docs/ROADMAP.md`
   - `docs/DECISIONS.md` (if architecture/contracts changed)


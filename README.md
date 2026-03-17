# Career Search Assistant Monorepo

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)

Production-oriented monorepo for a career search assistant that combines profile intake, document extraction, AI-assisted career-profile generation, deterministic job matching, notebook-style lead triage, scrape orchestration, and support/ops tooling.

This repository is the active project. The old `Collarcity` clone path in earlier README text was stale and has been removed.

## Current Stage

As of `2026-03-14`:

- M1 Core Intake + AI: completed
- M2 Extraction + Matching: completed
- M3 Backend + Worker Hardening: completed
- M4 Frontend Workflow Completion: substantially implemented
- M5 Robust Job Assistant Service: started
- M6 Automation + Cloud Readiness: partially implemented

The product is beyond boilerplate stage. It already supports a full local cross-service workflow and includes support-grade diagnostics, recovery paths, smoke coverage, and deployment/runbook documentation.

## What The System Does

Primary user workflow:

1. User authenticates.
2. User completes onboarding and profile intake.
3. User uploads documents for extraction.
4. API generates a canonical career profile using strict schema validation.
5. API either rematches from the shared catalog or enqueues a scrape run to the worker.
6. Worker collects job offers and calls back the API using idempotent completion semantics.
7. API persists notebook-ready offers, matching metadata, and workflow state.
8. User triages opportunities in the notebook and dashboard.

Implemented product surfaces include:

- guided onboarding with local/server draft recovery
- notebook-first dashboard with readiness and next-action guidance
- document upload, extraction diagnostics, and retry flows
- deterministic and hybrid job matching with persisted explanation metadata
- notebook ranking modes: `strict`, `approx`, `explore`
- persisted notebook preferences, filters, follow-up metadata, and quick-action queues
- manual scrape enqueue, preflight validation, and user-managed scrape scheduling
- admin/support metrics, incident bundles, callback exports, and stale-run recovery tools

## Monorepo Layout

- `apps/api` -> NestJS orchestrator for auth, profile/document pipeline, matching, notebook, schedule, ops, and worker callbacks
- `apps/worker` -> scraping and background ingestion worker
- `apps/web` -> Next.js product UI plus internal support/tester surfaces
- `packages/db` -> Drizzle schema, migrations, seeds, support scripts
- `packages/ui` -> shared UI primitives

## Current Architecture Highlights

- Canonical career profile schema is active in `career_profiles.content_json` with `schemaVersion: "1.0.0"`.
- Scrape execution is service-oriented: API enqueues, worker executes, API finalizes.
- Worker callbacks are replay-safe and support signature/OIDC validation.
- Scrape run lifecycle is tracked with explicit states, heartbeats, retry chains, and persisted event timelines.
- Shared job-offer catalog supports reuse/rematch before dispatching new worker runs.
- Workspace summary and notebook summary endpoints provide product-grade read models for the frontend.
- Support tooling combines committed API diagnostics with local read-only database queries.

## Quick Start

### 1) Clone and install

```bash
git clone https://github.com/DmytroLysachenko/nest-test.git
cd nest-test
pnpm install
```

### 2) Prepare environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
cp packages/db/.env.example packages/db/.env
```

### 3) Start Postgres

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4) Generate and run migrations

```bash
pnpm --filter @repo/db generate
pnpm --filter @repo/db migrate
pnpm --filter @repo/db build
```

### 5) Seed fixtures for smoke/e2e

```bash
pnpm --filter @repo/db seed:e2e
```

### 6) Start the local stack

```bash
pnpm start
```

Default local ports:

- API: `http://localhost:3000`
- Web: `http://localhost:3002`
- Worker: `http://localhost:4001`

## Core Commands

```bash
# full monorepo dev stack
pnpm start

# turbo dev without docker bootstrap
pnpm dev

# full workspace tests
pnpm test

# type checking
pnpm check-types

# build all packages/apps
pnpm build

# cross-service smoke flow
pnpm smoke:e2e

# install Playwright browsers for worker/web flows
pnpm --filter worker exec playwright install
pnpm --filter web exec playwright install
```

Useful targeted checks:

```bash
pnpm --filter api test -- --runInBand
pnpm --filter worker test
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web test:e2e
```

## Important Routes And Endpoints

Frontend routes:

- `/` -> notebook-first dashboard
- `/onboarding` -> guided setup flow
- `/tester` -> internal endpoint tester in supported environments
- `/ops` -> admin/support console

Important API routes:

- `/api/auth/oauth/google`
- `/api/workspace/summary`
- `/api/career-profiles/search-view`
- `/api/job-offers/summary`
- `/api/job-sources/preflight`
- `/api/job-sources/schedule`
- `/api/job-sources/schedule/trigger-now`
- `/api/job-sources/runs/:id/events`
- `/api/documents/diagnostics/summary`
- `/api/ops/metrics`
- `/api/ops/support/overview`

Swagger is available at `/docs` outside production.

## Smoke Coverage

`pnpm smoke:e2e` currently verifies:

- auth login and refresh-token rotation
- onboarding draft CRUD
- profile input and career-profile endpoints
- workspace summary and recovery guidance payloads
- document retry/recovery endpoints
- deterministic matching and notebook summary flows
- scrape preflight, enqueue, callback completion, and retry-safe worker flow
- scrape diagnostics, heartbeat persistence, and lifecycle guards
- document diagnostics summary
- schedule read/update/trigger-now flows

The smoke script expects local API, worker, and web services to be running.

## Current Strengths

- end-to-end local workflow is implemented
- contract surface is broad enough to support a real product UI
- strong run lifecycle observability for scraping and document flows
- support/ops tooling exists for incident correlation and recovery
- CI/CD and Cloud Run deployment path are already documented and partially automated

## Current Gaps

- worker queue is still in-memory and not crash-resilient across restarts
- some scrape scenarios still depend on live source behavior
- frontend visual consistency is improving but still mixed across older/newer surfaces
- smoke flow is broader now, but startup orchestration is not yet fully self-contained

## Canonical Docs

Use these as the source of truth instead of stretching this README into an operations manual:

- [AGENTS.md](./AGENTS.md)
- [docs/CODEX_HANDOFF.md](./docs/CODEX_HANDOFF.md)
- [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md)
- [docs/ROADMAP.md](./docs/ROADMAP.md)
- [docs/YEAR_PLAN.md](./docs/YEAR_PLAN.md)
- [docs/SPRINT_PLAN.md](./docs/SPRINT_PLAN.md)
- [docs/DECISIONS.md](./docs/DECISIONS.md)
- [docs/FRONTEND_STANDARDS.md](./docs/FRONTEND_STANDARDS.md)
- [docs/RUNBOOK.md](./docs/RUNBOOK.md)
- [docs/GCP_DEPLOY_MATRIX.md](./docs/GCP_DEPLOY_MATRIX.md)
- [docs/PROD_DEPLOY_GUIDE.md](./docs/PROD_DEPLOY_GUIDE.md)
- [docs/E2E_DEBUGGING.md](./docs/E2E_DEBUGGING.md)

## Development Rules

- Follow `AGENTS.md` for repo-specific engineering rules.
- Keep changes migration-driven for DB schema updates.
- Update docs when contracts or flows change.
- Run targeted tests for changed modules, and run `pnpm smoke:e2e` when cross-service behavior changes.

## License

MIT. See [LICENSE](./LICENSE).

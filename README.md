# Career Search Assistant Monorepo

Production-oriented monorepo for a career search assistant focused on profile intake, document extraction, AI-assisted career-profile generation, deterministic job matching, notebook-style opportunity triage, scrape orchestration, and support tooling.

This README is intentionally stable. It explains what the repository is, how it is structured, and how to run it locally. Detailed roadmap, implementation status, and operational reality live in `docs/`.

## Product Purpose

This product is meant to behave more like a job-search operating system than a listing mirror.

Core product goals:

- aggregate opportunities into one workflow
- deduplicate and rank them better than native job boards
- help users decide what to do next
- support follow-up, reminder, and application-prep workflows
- treat scraping as an acquisition layer, not the product moat

## Primary Workflow

1. User authenticates.
2. User completes onboarding and profile intake.
3. User uploads documents for extraction.
4. API generates a canonical career profile using strict schema validation.
5. API either rematches from the shared catalog or enqueues a scrape run to the worker.
6. Worker collects job offers and calls back the API using idempotent completion semantics.
7. API persists notebook-ready offers, matching metadata, and workflow state.
8. User triages opportunities in dashboard, discovery, and notebook surfaces.

## Monorepo Layout

- `apps/api` -> NestJS orchestrator for auth, profile/document pipeline, matching, notebook, schedule, ops, and worker callbacks
- `apps/worker` -> scraping and background ingestion worker
- `apps/web` -> Next.js product UI plus internal support/tester surfaces
- `packages/db` -> Drizzle schema, migrations, seeds, and support scripts
- `packages/ui` -> shared UI primitives

## Architecture Notes

- API owns user-facing workflow orchestration and persistence.
- Worker owns scrape execution and callback delivery.
- Web owns presentation and route state, not business orchestration.
- DB changes are migration-driven through `packages/db`.
- Support and operations diagnostics are documented under `docs/05_operations_and_deployment`.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/DmytroLysachenko/nest-test.git
cd nest-test
pnpm install
```

### 2. Prepare environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
cp packages/db/.env.example packages/db/.env
```

### 3. Start Postgres

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Generate and run migrations

```bash
pnpm --filter @repo/db generate
pnpm --filter @repo/db migrate
pnpm --filter @repo/db build
```

### 5. Seed local smoke or e2e fixtures

```bash
pnpm --filter @repo/db seed:e2e
```

### 6. Start the local stack

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

## Main Routes And Endpoints

Frontend routes:

- `/` -> dashboard
- `/onboarding` -> guided setup flow
- `/opportunities` -> discovery and review surface
- `/notebook` -> active workflow pipeline
- `/companies` -> company browse/detail surfaces
- `/planning` -> scrape planning and automation controls
- `/profile` -> profile and document readiness workflow
- `/ops` -> admin/support console
- `/tester` -> internal endpoint tester in supported environments

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

## Smoke And Validation

`pnpm smoke:e2e` is the main cross-service validation flow. It exercises core auth, onboarding, profile, notebook, scrape, schedule, diagnostics, and support paths across the local stack.

Use targeted tests for local development, and use smoke when a change affects cross-service behavior or workflow trust.

## Documentation Map

Use these as the source of truth for details:

- [AGENTS.md](./AGENTS.md)
- [docs/00_documentation_system/00_docs_index.md](./docs/00_documentation_system/00_docs_index.md)
- [docs/00_documentation_system/03_code_to_docs_map.md](./docs/00_documentation_system/03_code_to_docs_map.md)
- [docs/01_project_context/00_product_and_system_overview.md](./docs/01_project_context/00_product_and_system_overview.md)
- [docs/01_project_context/01_codex_handoff.md](./docs/01_project_context/01_codex_handoff.md)
- [docs/01_project_context/02_project_state.md](./docs/01_project_context/02_project_state.md)
- [docs/03_plans_and_roadmaps/01_roadmap.md](./docs/03_plans_and_roadmaps/01_roadmap.md)
- [docs/03_plans_and_roadmaps/02_sprint_plan.md](./docs/03_plans_and_roadmaps/02_sprint_plan.md)
- [docs/04_architecture_and_data/01_decisions.md](./docs/04_architecture_and_data/01_decisions.md)
- [docs/05_operations_and_deployment/01_runbook.md](./docs/05_operations_and_deployment/01_runbook.md)
- [docs/05_operations_and_deployment/02_e2e_debugging.md](./docs/05_operations_and_deployment/02_e2e_debugging.md)
- [docs/05_operations_and_deployment/03_prod_deploy_guide.md](./docs/05_operations_and_deployment/03_prod_deploy_guide.md)
- [docs/05_operations_and_deployment/04_gcp_deploy_matrix.md](./docs/05_operations_and_deployment/04_gcp_deploy_matrix.md)
- [docs/06_engineering_standards/01_frontend_standards.md](./docs/06_engineering_standards/01_frontend_standards.md)
- [docs/06_engineering_standards/02_backend_and_repo_standards.md](./docs/06_engineering_standards/02_backend_and_repo_standards.md)
- [docs/07_debugging_and_quality/01_debugging_playbook.md](./docs/07_debugging_and_quality/01_debugging_playbook.md)

## Development Rules

- Follow `AGENTS.md` for repo-specific delivery rules.
- Keep DB changes migration-driven.
- Keep API contracts explicit.
- Update owning docs when durable behavior changes.
- Run targeted checks for changed modules.
- Run `pnpm smoke:e2e` when cross-service behavior changes.

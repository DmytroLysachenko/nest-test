# Career Search Assistant Monorepo

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)

## Purpose
Full-stack monorepo for a career search assistant:
- `apps/api` (NestJS orchestrator)
- `apps/worker` (scraping/background processing)
- `apps/web` (Next.js frontend)
- `packages/db` (Drizzle schema/migrations/seeds)
- `packages/ui` (shared UI components)

## Canonical Docs
Read these instead of expanding this README:
- Agent execution rules: `AGENTS.md`
- Fresh Codex start: `docs/CODEX_HANDOFF.md`
- Current implemented state: `docs/PROJECT_STATE.md`
- Planned next work: `docs/ROADMAP.md`
- Key architecture decisions: `docs/DECISIONS.md`
- Frontend architecture standards: `docs/FRONTEND_STANDARDS.md`
- Local run/test commands: `docs/RUNBOOK.md`
- Operational recovery: `docs/operations-runbook.md`
- Scraper mapping reference: `docs/pracuj-query-mapping.md`

## Quick Start

### 1) Install
```bash
git clone https://github.com/DmytroQasttor/Collarcity.git
cd Collarcity
pnpm install
```

### 2) Configure env files
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
cp packages/db/.env.example packages/db/.env
```

### 3) Start DB
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4) Run migrations
```bash
pnpm --filter @repo/db generate
pnpm --filter @repo/db migrate
pnpm --filter @repo/db build
```

### 5) Start full stack
```bash
pnpm start
```

Default local ports:
- API: `http://localhost:3000`
- Web: `http://localhost:3002`
- Worker: `http://localhost:4001`

## Core Commands
```bash
# Seed fixture data for smoke/e2e
pnpm --filter @repo/db seed:e2e

# Full cross-service smoke check
pnpm smoke:e2e

# Worker browsers (one-time)
pnpm --filter worker exec playwright install
```

## Current Core Flow
1. User authenticates.
2. User submits profile input and uploads documents.
3. API extracts text and generates canonical career profile JSON.
4. API enqueues scrape request to worker.
5. Worker scrapes and callbacks API.
6. API persists offers and matching/notebook data.

## API Notes
- Base prefix: `/api`
- Swagger (non-production): `/docs`
- Health: `/health`

Use `apps/api/http/*.http` for endpoint examples.

## License
MIT. See `LICENSE`.

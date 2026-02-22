# Codex Handoff (Fast Start)

Use this file as the first read for a fresh Codex session.

## 1) Load Order (keep context small)

1. `AGENTS.md`
2. `docs/CODEX_HANDOFF.md` (this file)
3. `docs/PROJECT_STATE.md`
4. `docs/ROADMAP.md`
5. `docs/DECISIONS.md` (only if architecture/contract work)
6. `docs/FRONTEND_STANDARDS.md` (for FE tasks)
7. `docs/RUNBOOK.md` (only when running stack/tests)

## 2) Current System Shape

- `apps/api`: orchestrator (auth, profile/docs, generation, matching, notebook, scrape orchestration)
- `apps/worker`: scraper execution + callbacks
- `apps/web`: product UI + internal tester panels
- `packages/db`: schema, migrations, seeds

## 3) Golden Local Commands

```bash
pnpm install
pnpm --filter @repo/db migrate
pnpm --filter @repo/db seed:e2e
pnpm start
pnpm smoke:e2e
```

Expected dev ports:
- API: `3000`
- Web: `3002`
- Worker: `4001`

## 4) Critical Contracts (do not break silently)

- Canonical career profile schema is active in `career_profiles.content_json` (`schemaVersion: "1.0.0"`).
- Search/read model endpoint: `GET /api/career-profiles/search-view`.
- Scrape flow: API enqueue -> worker process -> callback complete (idempotent).
- Scraper must ignore `section-recommended-offers` and handle `zero-offers-section` via filter relaxation.

## 5) Where to Change What

- API DTO/contracts/services: `apps/api/src/features/**`
- Scraper behavior: `apps/worker/src/sources/pracuj-pl/**` and `apps/worker/src/jobs/**`
- FE feature UI/api split: `apps/web/src/features/**`
- DB schema/migrations/seeds: `packages/db/src/**`

## 6) Definition of Done (every feature/fix)

1. Tests updated for changed behavior.
2. `pnpm smoke:e2e` passes if cross-service behavior changed.
3. Docs updated (`PROJECT_STATE`, `ROADMAP`, `DECISIONS` when relevant).
4. No debug leftovers, no contract drift.

# Roadmap

Last updated: 2026-02-21

## Now (Execution Priority)

1. Frontend productization from internal tooling to user workflow UX.
2. Matching quality tuning (score calibration, stricter seniority/constraints behavior).
3. Scraper quality hardening and source-specific reliability.
4. CI quality gates (API/worker/web tests + smoke on protected branches).

## Next

1. Add profile quality scoring endpoint (explain missing evidence/signals).
2. Add run-level scrape diagnostics endpoint (relaxation trail, blocked pages, source stats).
3. Add notebook ranking modes:
   - strict fit
   - approximate fit
   - exploration
4. Add cached query/read models for FE cards and dashboard widgets.

## Later

1. Multi-source ingestion beyond Pracuj (source adapters).
2. Async extraction/profile generation queue (cloud tasks in production).
3. Observability stack:
   - metrics
   - alerting
   - trace correlation across API/worker callbacks
4. Staging/production deployment pipeline with rollback automation.

## Definition of Done (for each milestone item)

1. Feature implemented with tests (happy path + failure path).
2. `pnpm` build/tests pass for touched apps/packages.
3. `pnpm smoke:e2e` still passes.
4. Docs updated:
   - `PROJECT_STATE.md`
   - `ROADMAP.md`
   - `DECISIONS.md` when architecture/contract changed


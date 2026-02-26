# Roadmap

Last updated: 2026-02-26

## Now (Execution Priority)

1. Frontend productization from internal tooling to user workflow UX.
   - Status: onboarding wizard + notebook-first dashboard implemented; server draft recovery and workspace summary read model added.
2. Matching quality tuning (score calibration, stricter seniority/constraints behavior).
   - Status: in progress (env-tunable notebook ranking calibration shipped).
3. Scraper quality hardening and source-specific reliability.
   - Status: in progress (run diagnostics summary + cache-first reuse + filter canonicalization improvements).
4. CI quality gates (API/worker/web tests + smoke on protected branches).
   - Status: in progress (web e2e suite is now part of CI; smoke gate expansion pending branch policy alignment).
5. Reliability guardrails for scrape intake + admin ops visibility.
   - Status: in progress (per-user scrape backpressure + admin metrics endpoint implemented).

## Next

1. Add cached query/read models for FE cards and dashboard widgets.
2. Improve deterministic ranking calibration (mode thresholds + penalty tuning).
3. Add score-explanation audit export for support/debug workflows.
   - Status: completed (`/api/job-matching/audit` + `/api/job-matching/audit/export.csv` backed by persisted `job_matches.match_meta`).
4. Expand diagnostics aggregation for long-running scrape history.
5. Extend document diagnostics with percentile timing metrics per stage (upload/confirm/extract).

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

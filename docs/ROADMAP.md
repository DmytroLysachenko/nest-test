# Roadmap

Last updated: 2026-03-01

## Now (Execution Priority)

1. Frontend productization from internal tooling to user workflow UX.
   - Status: onboarding wizard + notebook-first dashboard implemented; server draft recovery and workspace summary read model added.
2. Matching quality tuning (score calibration, stricter seniority/constraints behavior).
   - Status: in progress (capped approx penalties + explore recency weighting shipped; threshold tuning ongoing).
3. Scraper quality hardening and source-specific reliability.
   - Status: in progress (run diagnostics summary + cache-first reuse + filter canonicalization improvements + timeline buckets + stale-run reconciliation + retry endpoint + worker heartbeat progress callbacks + transition guards).
4. CI quality gates (API/worker/web tests + smoke on protected branches).
   - Status: in progress (split verify/smoke workflows implemented; protected-branch policy enforcement pending repo settings).
5. Reliability guardrails for scrape intake + admin ops visibility.
   - Status: in progress (per-user scrape backpressure + admin metrics endpoint + explicit run-state transition guards + enqueue idempotency + retry-depth cap implemented).
6. Staging/production deployment pipeline with rollback automation.
   - Status: in progress (release-candidate image build/push + manual Cloud Run promotion + post-deploy verification implemented; rollback automation pending).

## Next

1. Add cached query/read models for FE cards and dashboard widgets.
2. Improve deterministic ranking calibration (mode thresholds + penalty tuning).
   - Status: in progress (trust-first matcher now includes stronger ambiguity/context penalties and improved employment alias handling).
3. Add score-explanation audit export for support/debug workflows.
   - Status: completed (`/api/job-matching/audit` + `/api/job-matching/audit/export.csv` backed by persisted `job_matches.match_meta`).
4. Expand diagnostics aggregation for long-running scrape history.
   - Status: in progress (optional timeline buckets + lifecycle counters added to diagnostics summary).
5. Extend document diagnostics with percentile timing metrics per stage (upload/confirm/extract).
   - Status: in progress (`document_stage_metrics` + `/api/documents/diagnostics/summary` added).

## Later

1. Multi-source ingestion beyond Pracuj (source adapters).
2. Async extraction/profile generation queue (cloud tasks in production).
3. Observability stack:
   - metrics
   - alerting
   - trace correlation across API/worker callbacks
4. Full rollback automation for staging/production deployment pipeline.

## Definition of Done (for each milestone item)

1. Feature implemented with tests (happy path + failure path).
2. `pnpm` build/tests pass for touched apps/packages.
3. `pnpm smoke:e2e` still passes.
4. Docs updated:
   - `PROJECT_STATE.md`
   - `ROADMAP.md`
   - `DECISIONS.md` when architecture/contract changed

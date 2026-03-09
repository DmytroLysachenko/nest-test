# Roadmap

Last updated: 2026-03-09

## Now (Execution Priority)

1. Frontend productization from internal tooling to user workflow UX.
   - Status: onboarding wizard + notebook-first dashboard implemented; server draft recovery, recovery-center guidance, schedule controls, and notebook triage summary shipped.
2. Matching quality tuning (score calibration, stricter seniority/constraints behavior).
   - Status: in progress (capped approx penalties + explore recency weighting shipped; threshold tuning ongoing).
3. Scraper quality hardening and source-specific reliability.
   - Status: in progress (callback attempt ordering + payload hash validation + deterministic offer identity key + ops replay/reconcile endpoints added).
4. CI quality gates (API/worker/web tests + smoke on protected branches).
   - Status: in progress (split verify/smoke workflows implemented; protected-branch policy enforcement pending repo settings).
5. Reliability guardrails for scrape intake + admin ops visibility.
   - Status: in progress (per-user scrape backpressure + admin metrics endpoint + explicit run-state transition guards + enqueue idempotency + retry-depth cap implemented; user preflight + schedule trigger-now now exposed in product UI/API).
6. Staging/production deployment pipeline with rollback automation.
   - Status: in progress (release-candidate image build/push + manual Cloud Run promotion + post-deploy verification implemented; rollback automation pending).
7. Request-budget guardrails (API throttling + FE query traffic controls).
   - Status: completed (env-driven global API throttle and frontend query refetch/stale controls shipped).
8. Authentication hardening and OAuth onboarding.
   - Status: in progress (normalized API error taxonomy + env-tunable auth throttles + Google OAuth login flow shipped).
9. Scrape automation scheduling.
   - Status: completed (user schedule model + secure trigger endpoint + deploy-managed Cloud Scheduler wiring shipped).

## Next

1. Add cached query/read models for FE cards and dashboard widgets.
   - Status: in progress (workspace summary now includes next-action/activity/health plus recovery guidance; notebook summary read model shipped for quick triage).
2. Improve deterministic ranking calibration (mode thresholds + penalty tuning).
   - Status: in progress (trust-first matcher now includes stronger ambiguity/context penalties and improved employment alias handling).
3. Add score-explanation audit export for support/debug workflows.
   - Status: completed (`/api/job-matching/audit` + `/api/job-matching/audit/export.csv` backed by persisted `job_matches.match_meta`).
4. Expand diagnostics aggregation for long-running scrape history.
   - Status: in progress (optional timeline buckets + lifecycle counters added to diagnostics summary; filtered run history, CSV export, and source health summary now shipped).
5. Extend document diagnostics with percentile timing metrics per stage (upload/confirm/extract).
   - Status: in progress (`document_stage_metrics` + `/api/documents/diagnostics/summary` added; extraction retry endpoints shipped to improve user recovery path).
6. Persist user notebook operating preferences across sessions/devices.
   - Status: completed (`/api/job-offers/preferences` + web hydration/persistence shipped).

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

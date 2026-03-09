# Roadmap

Last updated: 2026-03-09

## Product Direction

The current direction is to finish turning the repo from a technically capable internal tool into a reliable job-assistant product. That means prioritizing:

1. smooth setup and recovery for normal users
2. faster notebook triage and application workflow throughput
3. stronger scrape reliability and support diagnostics
4. safer automation, smoke, and deployment behavior

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

## Delivery Themes For Upcoming Sprints

1. Workflow completion
   - remove remaining dead ends in onboarding, recovery, notebook, and schedule UX
2. Reliability and supportability
   - improve scrape/source observability, startup stability, and operator diagnostics
3. Assistant quality
   - improve triage, prioritization, and prep/follow-up outcomes users get from the product
4. Platform hardening
   - move fragile local/in-memory assumptions toward production-safe background execution and deployment

## Near-Term Sprint Sequence

1. Sprint A: workflow completion and blocker removal
   - tighten recovery-center usage across dashboard/notebook/profile
   - finish schedule UX and preflight clarity
   - remove remaining ambiguous empty states
2. Sprint B: notebook throughput and application pipeline
   - follow-up queues, stale-offer actions, better bulk triage, stronger summary views
3. Sprint C: scraper/source quality hardening
   - source normalization, parser resilience, better degraded/blocked classification, replay/debug improvements
4. Sprint D: durable async and automation
   - move extraction/profile generation and later scrape orchestration toward durable queue execution
5. Sprint E: release and observability hardening
   - startup orchestration, smoke reliability, deploy rollback, alerting, and operational dashboards

## Definition of Done (for each milestone item)

1. Feature implemented with tests (happy path + failure path).
2. `pnpm` build/tests pass for touched apps/packages.
3. `pnpm smoke:e2e` still passes.
4. Docs updated:
   - `PROJECT_STATE.md`
   - `ROADMAP.md`
   - `DECISIONS.md` when architecture/contract changed

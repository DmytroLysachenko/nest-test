# Roadmap

Last updated: 2026-03-30

## Purpose

This document is the main forward-looking product and delivery roadmap.

It should stay high signal:

1. current priorities
2. next priorities
3. later priorities
4. sequencing rules and guardrails

## Product Direction

The current direction is to finish turning the repo from a technically capable internal tool into a reliable job-assistant product. That means prioritizing:

1. smooth setup and recovery for normal users
2. faster notebook triage and application workflow throughput
3. stronger scrape reliability and support diagnostics
4. safer automation, smoke, and deployment behavior

## Product Guardrails

To avoid chaotic feature work, the roadmap follows these rules:

1. Scraping is infrastructure, not the end product.
2. The app should win on cross-source workflow quality, not on "we also show listings".
3. New sources must be added selectively, not aggressively.
4. Features that reduce user decision time are more valuable than features that only increase listing volume.
5. Reliability and supportability are part of product scope, not cleanup work.

## Anti-Goals

The project should not drift into:

1. a generic multi-board listing mirror with weak workflow value
2. source expansion faster than supportability and diagnostics can absorb
3. large source-specific hacks without durable transport/reliability strategy
4. product surfaces that duplicate native job-board behavior without improving user outcomes

## Now (Execution Priority)

1. Workflow differentiation in dashboard + notebook.
   - Status: in progress (normalized follow-up fields, action-plan read model, prep packet read model, discovery/opportunities split, grouped discovery queues, and notebook Kanban-first pipeline workflow shipped; remaining work is deeper reminder reliability and richer prep support).
2. Matching quality tuning (score calibration, stricter seniority/constraints behavior).
   - Status: in progress (capped approx penalties + explore recency weighting shipped; threshold tuning ongoing).
3. Scraper quality hardening and source-specific reliability.
   - Status: in progress (callback attempt ordering + payload hash validation + deterministic offer identity key + ops replay/reconcile endpoints added; worker alias normalization and blocked/degraded/partial classification tightened; source-health rollups expanded).
4. CI quality gates (API/worker/web tests + smoke on protected branches).
   - Status: in progress (split verify/smoke workflows implemented; protected-branch policy enforcement pending repo settings).
5. Reliability guardrails for scrape intake + admin ops visibility.
   - Status: in progress (per-user scrape backpressure + admin metrics endpoint + explicit run-state transition guards + enqueue idempotency + retry-depth cap + catalog-first rematch + source-health automation backoff implemented; user preflight + schedule trigger-now now exposed in product UI/API).
6. Staging/production deployment pipeline with rollback automation.
   - Status: in progress (release-candidate image build/push + manual Cloud Run promotion + post-deploy verification implemented; release/rollback artifacts now include revision/image metadata; traffic rollback automation exists and needs production proving).
7. Request-budget guardrails (API throttling + FE query traffic controls).
   - Status: completed (env-driven global API throttle and frontend query refetch/stale controls shipped).
8. Authentication hardening and OAuth onboarding.
   - Status: in progress (normalized API error taxonomy + env-tunable auth throttles + Google OAuth login flow shipped).
9. Scrape automation scheduling.
   - Status: completed (user schedule model + secure trigger endpoint + deploy-managed Cloud Scheduler wiring shipped).

## Next

1. Make notebook/action workflow clearly better than native boards.
   - Scope:
     - follow-up and reminder reliability
     - stronger "today's focus" / "needs attention" queues
     - richer application prep and next-step support
     - explicit hidden/degraded result messaging
     - continued quality improvements for Kanban throughput and active-offer workspace ergonomics
   - Status: in progress.
2. Tighten scrape output usefulness, not just scrape completion.
   - Scope:
     - adaptive broad-acquisition query planning with target listing windows
     - minimum fresh-candidate gating before catalog/db reuse can satisfy a user scrape
     - configurable source target windows and detail-fetch budgets
     - productivity diagnostics that explain output loss after healthy runs
     - fetch-order prioritization from listing-summary richness
     - better degraded-result handling
     - stronger salvage rules
     - clearer zero-result vs blocked-result semantics
     - better run-to-notebook linking visibility
   - Status: in progress.
3. Improve deterministic ranking calibration and cross-source trust handling.
   - Scope:
     - mode thresholds + penalty tuning
     - explanation quality
     - stronger handling of incomplete source metadata
   - Status: in progress.
4. Expand diagnostics and source-health aggregation for long-running scrape history.
   - Status: in progress (timeline buckets, lifecycle counters, run/export surfaces, transport/browser diagnostics shipped).
5. Extend document diagnostics with percentile timing metrics per stage (upload/confirm/extract).
   - Status: in progress (`document_stage_metrics` + `/api/documents/diagnostics/summary` added; extraction retry endpoints and explicit retry outcome summaries shipped).
6. Persist user notebook operating preferences across sessions/devices.
   - Status: completed (`/api/job-offers/preferences` + web hydration/persistence shipped).

## Later

1. Selective multi-source ingestion beyond Pracuj.
   - Add a source only if:
     - it adds meaningful unique supply
     - transport/reliability path looks maintainable
     - support/debug cost is acceptable
   - Suggested order:
     - relatively structured local boards first
     - high-friction sources like LinkedIn only after stronger proof that the product value is already real
2. Async extraction/profile generation queue (cloud tasks in production).
3. Observability stack:
   - metrics
   - alerting
   - trace correlation across API/worker callbacks
4. Full rollback automation for staging/production deployment pipeline.
   - Status: partially implemented (traffic rollback workflow exists; promotion evidence and rollback artifacts are now richer, but production rehearsal/alert integration is still outstanding).

## Delivery Themes For Upcoming Sprints

1. Workflow completion
   - remove remaining dead ends in onboarding, recovery, notebook, and schedule UX
2. Workflow differentiation
   - improve triage, prioritization, follow-up, and prep outcomes enough that native boards are not an obvious substitute
3. Reliability and supportability
   - improve scrape/source observability, startup stability, operator diagnostics, and source-health controls
4. Platform hardening
   - move fragile local/in-memory assumptions toward production-safe background execution and deployment

## Source Expansion Policy

Before implementing a new adapter, require:

1. one clear user-value reason for the source
2. one expected acquisition strategy (`http-only`, `http-first`, `hybrid`, or `browser-first`)
3. one support/debug plan for blocked/degraded outcomes
4. smoke-testable local fixtures for the parser
5. no silent product assumption that "more sources automatically means more value"

## Near-Term Sprint Sequence

1. Sprint A: workflow completion and blocker removal
   - tighten recovery-center usage across dashboard/notebook/profile
   - finish schedule UX and preflight clarity
   - remove remaining ambiguous empty states
2. Sprint B: notebook throughput and application pipeline
   - follow-up queues, stale-offer actions, better bulk triage, stronger summary views
3. Sprint C: scraper/source quality hardening
   - source normalization, parser resilience, adaptive acquisition filters, listing-probe planning, detail-budget tuning, better degraded/blocked classification, catalog quality-state persistence, replay/debug improvements
4. Sprint D: durable async and automation
   - move extraction/profile generation and later scrape orchestration toward durable queue execution while keeping catalog-rematch paths off the worker when possible
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

## Scrape Productivity Tuning Rules

When scrape runs are healthy but output is weak, tune in this order:

1. Acquisition breadth first.
   - Adjust the target listing window before touching notebook thresholds.
2. Detail productivity second.
   - Tune detail budgets and fetch ordering before widening salvage.
3. Matching tolerance third.
   - Soften only wording-driven false blockers; keep strict notebook trust-first.
4. Catalog quality protection always.
   - Prefer richer detail-backed rows over salvage or low-context updates.
   - Do not let already-linked or stale reused offers satisfy fresh-result expectations too cheaply.
5. Notebook strictness last.
   - Prefer hidden/degraded-result messaging over weakening default strict mode.

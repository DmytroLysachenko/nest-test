# Scrape Feature

Last updated: 2026-05-12

## Purpose

This feature acquires job opportunities for the user, either by reusing the shared catalog or by triggering fresh source ingestion.

## User value

It helps the user get relevant opportunities, rerun acquisition when intent changes, and trust outcomes because the lifecycle is observable.

## Scope

Includes preflight, manual and scheduled runs, worker execution, parsing, normalization, incremental offer delivery, callback completion, catalog persistence, and diagnostics.

Does not own notebook status workflow or follow-up planning.

## Main workflow

1. User requests opportunities manually or via schedule.
2. API decides between catalog rematch and fresh scrape.
3. Worker fetches, parses, and normalizes source data.
4. API upserts `job_offers`, finalizes scrape state, then performs notebook linking as best-effort post-persist work.
5. Frontend surfaces the result in opportunities or notebook views.

## Responsibilities

- API:
  - preflight, enqueue, completion, rematch, catalog persistence, post-persist notebook linking, diagnostics
- Worker:
  - fetch, parse, normalize, incremental offer delivery, callback delivery
- Web:
  - scrape entry points, status visibility, opportunities entry
- DB:
  - run history, shared catalog, user linkage, schedule and forensic events

## Code areas

- `apps/api/src/features/job-sources`
- `apps/api/src/features/ops`
- `apps/worker/src/jobs`
- `apps/worker/src/sources/pracuj-pl`
- `apps/worker/src/db`

## Data model

Primary tables: `job_source_runs`, `job_offers`, `user_job_offers`, `job_offer_source_observations`, `job_offer_raw_payloads`, `scrape_schedule_events`, and scrape event tables.

Current standardization direction:

- scrape ingestion now preserves raw offer snapshot fields while also resolving structured catalog references when confidence is acceptable
- first active structured refs are company, contract type, employment type, work mode, and selected category context
- canonical offer rows now also persist structured salary columns, source-company profile URL, apply URL, and posted-at when available
- canonical offer rows now also persist `expires_at` from source-derived offer validity signals when available; source JSON-LD `validThrough` is the preferred expiry signal for Pracuj
- multi-value offer facts now persist in normalized relation tables for contract types, work modes, work schedules, seniority levels, and technologies
- per-run observed source facts and raw payloads are persisted separately from the canonical offer row for replay/debug safety
- per-run observed source facts now include expiry state/date and a bounded structured section snapshot so removed offers remain understandable without storing full HTML
- cache/catalog reuse now requires a minimum fresh candidate yield instead of relying only on gross reused result counts
- enqueue responses now return explicit reuse diagnostics when catalog rematch or DB reuse is rejected before worker dispatch
- source health now includes observation-backed coverage metrics for missing employment type, empty requirements, source-profile capture, apply-link capture, and expiry capture

Schema references:

- `packages/db/src/schema/job-source-runs.ts`
- `packages/db/src/schema/job-offers.ts`
- `packages/db/src/schema/user-job-offers.ts`
- `packages/db/src/schema/job-offer-source-observations.ts`
- `packages/db/src/schema/job-offer-raw-payloads.ts`
- `packages/db/src/schema/scrape-schedule-events.ts`
- `packages/db/src/catalog-normalization.ts`
- `packages/db/src/catalog-persistence.ts`

## APIs/events

Representative endpoints include `/api/job-sources/preflight`, `/api/job-sources/schedule`, `/api/job-sources/schedule/trigger-now`, and `/api/job-sources/runs/:id/events`.

Internal worker delivery endpoints also include `/api/job-sources/runs/:id/heartbeat`, `/api/job-sources/runs/:id/offers`, and `/api/job-sources/complete`.

Current schedule-trust additions:

- schedule responses now distinguish the saved schedule itself from proven scheduled enqueue evidence
- `/api/job-sources/schedule` now also carries the latest successful scheduled enqueue timestamp and run id
- planning/query polling should treat “next window passed with no later successful scheduled enqueue” as unresolved trust, not as silent success

Current enqueue contract direction:

- `/api/job-sources/scrape` may satisfy a request from catalog rematch, DB reuse, or worker dispatch
- when reuse is considered but rejected, `reuseDiagnostics` explains whether the cause was insufficient fresh candidates, no matchable catalog rows, no cached run, or no cached offers
- accepted offers can now be persisted incrementally during a running scrape instead of waiting only for terminal callback completion
- terminal scrape failure now preserves already-ingested offers and links them into `user_job_offers` when possible instead of dropping the run output
- worker offer payloads now carry both `isExpired` and `expiresAt`; `isExpired` supports quick filtering while `expiresAt` preserves the source-derived validity date for audits and later UX
- scrape completion is now intentionally more separate from matching: shared catalog persistence and terminal run finalization no longer fail just because notebook linking or matching throws later in the path
- when post-persist notebook linking fails, the run keeps its persisted catalog output and records deferred linking state in run progress/events so rematch or recovery can happen separately
- schedule cron handling now supports weekday expressions such as `0 6 * * 1-5` without collapsing to a daily default
- stale watchdog failures now distinguish `worker-not-started` from `heartbeat-stopped-or-callback-missing` in the stored run error
- worker pipeline orchestration now uses a source-adapter contract so future sites can reuse fetch/parse/normalize stages without copying the Pracuj orchestration path
- local worker diagnostics now include `pnpm --filter worker scrape:once -- --source pracuj-pl-it --listingUrl <url> --limit <n>` for single-run execution outside the full stack
- run diagnostics now expose a usefulness read model so UI/support can distinguish useful, hidden, degraded, blocked, empty, failed, and pending outcomes without recomputing raw counters
- Pracuj parser drift coverage now includes changed detail-section headings and semicolon-delimited requirement strings

Operational and recovery endpoints live under `apps/api/src/features/ops`.

## Dependencies

Depends on auth, profile input, career profile, worker adapters, and notebook linkage.

Used by opportunities, notebook, dashboard summary, and support/ops tools.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/99_archive_legacy/05_catalog_standardization_implementation_plan.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/04_architecture_and_data/02_pracuj_query_mapping.md`
- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`

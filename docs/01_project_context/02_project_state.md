# Project State

Last updated: 2026-05-04

## Purpose

This document describes current reality.

It should answer:

1. what is already implemented
2. what is stable
3. what is still in progress
4. what product and platform risks remain

## Milestone Progress Snapshot

- M1 Core Intake + AI: completed
  - auth, profile input intake, document extraction, career-profile generation
- M2 Extraction + Matching: completed
  - canonical profile schema, deterministic matching, persisted match audit metadata
- M3 BE + Worker Hardening: completed
  - worker callback safety, retry taxonomy, stale-run reconciliation, diagnostics, queue/deploy hardening
- Reliability tranche in progress
  - run stories, artifact-backed diagnostics, silent-failure detection, and notebook-visible update trust explanations are now the active priority before broader product expansion
- M4 Frontend Workflow Completion: implemented
  - onboarding, notebook-first dashboard, persisted notebook preferences, recovery guidance, schedule/preflight controls, action-oriented notebook surfaces
- M5 Robust Job Assistant Service: in progress
  - notebook triage summary, action-plan read models, normalized follow-up workflow fields, prep packets, ops surfaces, workflow recovery, support-grade exports
- M6 Automation + Cloud Readiness: partially implemented
  - scheduler wiring, Cloud Run release path, post-deploy health checks, smoke/readiness hardening

## Current Architecture

- Monorepo apps:
  - `apps/api` (NestJS orchestrator)
  - `apps/worker` (scraping/background tasks)
  - `apps/web` (Next.js frontend + internal tester)
- Shared packages:
  - `packages/db` (Drizzle schema/migrations/seeds)
  - `packages/ui` (shared UI primitives)

## Honest Product Assessment

The application is no longer a toy project, but it is not yet a mature product.

Current reality:

- the architecture is credible and increasingly supportable
- the notebook/workflow side has real product potential
- scraping remains the main operational risk and the easiest way for the product to feel brittle
- if the app only mirrors listings, it is strategically weak

The product only makes sense long-term if it behaves like a job-search operating system:

- aggregate opportunities across sources
- deduplicate and rank them better than native boards
- help users decide what to do next
- help users manage follow-up and application progress

That framing should guide future implementation more than raw source count.

## Stable Flows Implemented

- Auth with refresh-token rotation.
- Profile input normalization.
- Document upload/extract flow.
- Career profile generation with strict JSON schema validation.
- Deterministic/hybrid job matching.
- Scrape orchestration from API to worker callback.
- User notebook flow for status/meta/history/scoring.
- End-to-end smoke script with DB seed + API/worker/web checks.

## User-Facing Product Progress

- Onboarding and setup
  - guided onboarding route
  - local + server draft recovery
  - profile/document based readiness signals
- Workspace and recovery
  - notebook-first dashboard
  - next-action and activity timeline
  - recovery center with blocker-specific CTA routing
  - readiness breakdown and recommended setup sequence
- Documents
  - upload + extraction diagnostics
  - upload-health visibility
  - retry single failed extraction
  - retry all failed extractions
- Notebook and applications
  - opportunities review surface for matched-role discovery
  - notebook pipeline surface for active kept roles
  - discovery now uses grouped review queues while notebook uses a Kanban-first board with a full-width active-offer workspace
  - normalized company and taxonomy context is now exposed directly in notebook and discovery offer details
  - strict/approx/explore ranking modes
  - persisted filters and saved preset
  - normalized follow-up fields plus compatibility hydration back into `pipelineMeta`
  - persisted follow-up filters and reminder metadata
  - summary counts for quick triage
  - dashboard focus queue for follow-up due, strict top matches, and unscored leads
  - dashboard action-plan buckets for due, upcoming, missing-next-step, stale, and strict-top work
  - one-click follow-up complete/snooze/clear actions
  - prep packet read model for reply/interview preparation
  - workflow attention signals now classify active roles as overdue, due-today, prep-recommended, awaiting-decision, missing-next-step, or stale-pipeline directly in the notebook read model
  - notebook list/focus read models now expose deterministic recommended actions so the web can show next moves without duplicating workflow business logic
  - notebook and discovery details now expose scrape reliability context for degraded, partial, and stale-run-recovered offers
  - notebook reminder preview now exposes overdue, due-today, upcoming, and stale-pipeline work as an in-app read model
  - external email reminder delivery now persists per-offer daily-window state (`pending` / `delivered` / `failed`) and is surfaced back into notebook list/detail read models
  - notebook action-plan and selected-offer workspace now expose one-click follow-up shortcuts for done/snooze/prep flows without duplicating queue logic in web
  - notebook now surfaces reminder bucket cards directly on the route so overdue, due-today, upcoming, and stale recovery queues can be opened without hunting through filters first
  - selected-offer follow-up controls now cover tomorrow / 3-day / 1-week completion and snooze paths, reducing repeated date editing for routine recovery work
  - queue-level bulk workflow maintenance now also supports one-click reminder presets for tomorrow / 3-day / 1-week follow-up stamping across the current selection
  - reminder delivery copy now distinguishes notebook-owned follow-up tracking from external email delivery so failed email does not look like lost notebook state
  - notebook now exposes direct recovery lanes for failed reminder delivery, stale roles, and missing-next-step cleanup instead of relying only on filters or list scanning
  - dashboard focus and action-plan lanes now include due-today, prep-next, and awaiting-decision workflow slices with explicit rationale and CTA metadata
  - pipeline bulk editing now supports decision checkpoints and prep-needed flags in addition to follow-up planning
  - bulk status flows, metadata, scoring, prep generation
- Scraping and automation
  - manual enqueue
  - profile-derived scrape resolution
  - preflight blockers/warnings before enqueue
  - user-managed scrape schedule
  - trigger-now for enabled schedule
  - planning automation now surfaces recent schedule enqueue evidence directly from persisted schedule events so cadence trust can be checked without opening admin tooling
  - enqueue responses and notebook-adjacent job-source UX now expose explicit reuse diagnostics when catalog rematch or DB reuse is skipped because fresh-candidate minimums were not met
  - scrape ingestion now persists per-run source observations and raw payload ledgers alongside the canonical offer row
  - scrape callbacks now preserve structured offer details end-to-end so catalog rematch and matching can use parsed technologies, requirements, position levels, work modes, contract types, apply links, and company profile URLs
  - scrape diagnostics now expose discovered/detail/salvage quality counters so healthy completion can be separated from useful output
  - notebook/discovery/prep offer details now expose normalized structured arrays for contract types, work modes, schedules, seniority, and technologies
- Admin/support operations
  - metrics dashboard
  - run history and callback event export
  - source health summary
  - support overview, scrape incident bundle, user incident bundle, and correlation lookup
  - dead-letter replay and stale-run reconcile controls
  - DB-backed scrape execution audit trail and forensic timeline endpoint
  - permission-based ops access control backed by persisted role-permission mappings

## Backend and Platform Progress By Area

- API orchestrator
  - owns all user workflow read models and recovery decisions
  - explicit DTO coverage has improved for notebook, ops, schedule, and workspace summary
  - contract surface is now broad enough to support a product UI instead of internal-tool panels
  - modularization is now an active engineering concern because `job-sources` and `job-offers` service files have grown beyond easy human scanability
  - feature-local helper modules are now the preferred way to move pure derivation, shaping, and preference logic out of large Nest services before creating more service classes
  - support-facing read models now provide LLM-friendly incident bundles instead of forcing raw endpoint composition
  - ops now has an internal webhook alert dispatch path with persisted delivery history so callback dead letters, stale runs, and other alert flags can trigger proactive notifications instead of dashboard-only review
  - job-offer read models now expose normalized company and taxonomy summaries in addition to raw listing fields
  - job-offer read models now also expose normalized multi-value relations so structured review does not depend only on legacy `details` JSON
  - notebook and discovery list responses now also expose explicit collection-state guidance so hidden/degraded/empty queues are explained by API instead of inferred only in the web layer
  - prep packet responses now include workflow-aware attention context and requirement highlights in addition to the existing role/profile summary
  - scrape enqueue responses now return explicit catalog-rematch and DB-reuse diagnostics so fresh-result gating is visible instead of silently falling through to worker dispatch
- Worker
  - scrape lifecycle visibility is materially stronger
  - duplicate active scrape execution protection now uses a durable `worker_task_executions` lease row instead of relying only on event-history reads
  - diagnostics now distinguish degraded/empty/blocked/partial outcomes
  - diagnostics now also expose artifact manifests, stage metrics, and silent-failure classification so completed-but-useless runs are not treated as healthy success
  - stage metrics now distinguish unique discovered offers, full-detail offers, partial-detail offers, and listing-salvaged offers
  - run diagnostics now expose a dedicated usefulness read model for listing, candidate, match, notebook-linking, strict-hidden, and degraded-output impact
  - source-specific alias normalization is now deterministic for contract type, work mode, and seniority fields
  - multi-value contract/work-mode/work-schedule source strings are now split before canonicalization so combined labels stop creating low-value taxonomy rows
  - Pracuj parsing now carries source profile URL, apply URL, posted-at hints, source-derived expiry dates, structured section snapshots, raw payload subsets, and sparse-field diagnostics into callback normalization
  - Pracuj parsing now also has rendered-HTML fallbacks for visible salary, requirements, responsibilities, technologies, and common Polish/ASCII heading drift
  - Pracuj parser drift tests now cover changed detail-section headings and semicolon-delimited requirement strings
  - Pracuj parser tests now include a richer rendered-offer fixture that verifies salary, apply URL, source-company profile URL, technologies, work mode, contracts, requirements, and responsibilities
  - callback envelope is replay-safe and increasingly support-friendly
- Web
  - major move from panel-heavy internal tooling toward guided product workflow
  - opportunities now handles first-pass discovery while notebook is now a distinct active pipeline workspace
  - workspace shell header now behaves like full-width app chrome instead of another floating card, which materially improves the sense of one connected workspace
  - notebook board cards now prioritize due work and active next-step context instead of acting like a generic status grid
  - notebook now exposes a visible bulk workflow editor for active pipeline roles instead of limiting batch edits to follow-up-only metadata
  - opportunity empty states and dashboard focus cards now show server-driven trust messaging rather than generic “no data” copy
  - dashboard, planning, shell, and discovery review surfaces are now in an active product-boundary cleanup pass that replaces raw sourcing language with user-facing automation wording
  - the end-user automation page now relies on schedule state and readiness guidance only; it no longer pulls raw update history, scheduler event feeds, or source-health diagnostics into the normal product route
  - planning no longer has the sticky utility-rail overlap that previously broke the automation surface at common desktop widths
  - discovery detail rail now uses a controlled desktop-height layout with internal scrolling and a reachable action bar
  - opportunity pagination and filters now survive reload/back/forward through URL ownership, including explicit `page`, `perPage`, `search`, `tag`, `mode`, and selected-offer context
  - opportunities and companies free-text filters now debounce before route/query updates, which reduces request churn and rate-limit pressure
  - document, profile, progress, and notebook-empty-state copy has also been shifted further away from diagnostics/run jargon toward plain-language status and recovery wording
  - document technical diagnostics are now hidden by default on end-user routes and can be surfaced only when a route explicitly opts into technical detail
  - notebook refresh controls and profile search-summary copy now use product-facing language around fresh matches and profile direction instead of sourcing/indexing terminology
  - app shell chrome, dashboard, planning, and profile pages now use a lighter hierarchy with fewer nested utility cards, and the remaining advanced diagnostics stay on admin/tester surfaces instead of normal user routes
  - the information-architecture and workflow-ownership cleanup is now implemented across home, planning, opportunities, notebook, progress, and profile
  - progress now acts as a momentum/history surface instead of a second dashboard-style orientation page
  - profile avoids acting like a general recovery hub, while notebook controls are explicitly pipeline-only and route loading states describe discovery vs active-work purpose instead of generic readiness checks
  - notebook page data now comes from notebook-owned queries plus a minimal route-level update-status handoff, and planning/progress blocker routing targets the owning route instead of falling back through notebook assumptions
  - notebook, discovery, and workflow summary queries now refetch more reliably after offer mutations, so route-to-route handoff trust is materially better without making all queries globally chatty
  - company browse/detail routes now use flatter loading and content composition, while profile hierarchy now better prioritizes the input source-of-truth surface over secondary support widgets
  - undo toast actions now use lighter integrated controls rather than harsh black action blocks
  - still contains mixed maturity areas where some screens feel productized and some remain utilitarian
  - company detail route now resolves dynamic params correctly in App Router client rendering, and the empty state includes safe navigation back to companies/opportunities instead of a dead end

### Current Web Baseline After The UX/Query Tranche

- Workspace shell:
  - full-width header chrome
  - calmer transition between sidebar, header, and page content
- Planning:
  - no sticky overlap bug
  - flatter automation/support composition
- Opportunities:
  - debounced free-text filtering
  - URL-owned discovery and pagination state
  - lighter queue controls and details rail
- Notebook:
  - narrower route-local state ownership
  - stronger cross-route freshness after mutations
  - flatter action-plan and selected-offer composition
- Companies:
  - debounced browse filters
  - URL-restorable list state
  - improved loaders and flatter browse/detail surfaces
- Profile:
  - stronger input-first hierarchy
  - user-facing quality signal labels
  - less visually wasteful support sections
- Shared UX:
  - lighter surface primitives
  - lighter undo toast action affordances
  - regression coverage for route query hygiene and workflow freshness
- Database and migrations
  - schema now supports notebook preferences, callback attempt ledger, stage metrics, and richer run lifecycle fields
  - catalog ingestion now starts resolving normalized company and taxonomy references alongside raw offer snapshots
  - catalog persistence now also stores source observation history, raw payload ledgers, source-company profiles, structured compensation columns, and normalized multi-value offer relations
  - company alias persistence is now being tightened so aliases are treated as additive identity evidence instead of automatic copies of the canonical company row
- CI/CD and smoke
  - split verify/smoke gates exist
- release candidate and manual production promotion exist
- deployment workflows now emit machine-readable release metadata with resolved revisions/images
- smoke now auto-starts dedicated local services, repairs stale fixture scrape runs, and tolerates rate-limit windows during polling

## Key Technical Decisions Active in Code

- Canonical career profile schema (`schemaVersion: "1.0.0"`).
- No v1/v2 dual-read path; schema replaced in-place pre-production.
- Worker scraping is service-oriented (API enqueues, worker callbacks).
- In-memory worker queue with controlled concurrency.
- Durable worker ingress lease ownership via `worker_task_executions`, while the in-process queue remains a local execution/runtime limitation.
- Callback idempotency and optional callback signature validation.
- Callback retry uses exponential backoff + jitter with env-driven caps.
- Scraper ignores recommended offers and relaxes strict filters when zero results.
- Career profile now has denormalized search projection columns.
- API and worker enforce request body size limits (env-driven).
- API validates scrape listing URL allowlist per source before enqueue.
- API enforces per-user active scrape backpressure (`SCRAPE_MAX_ACTIVE_RUNS_PER_USER`).
- Notebook supports ranking modes (`strict` / `approx` / `explore`) with explanation tags per offer.
- Notebook ranking calibration is env-tunable (approx penalties/bonuses and explore unscored base).
- Notebook ranking calibration now includes capped approx penalties and configurable explore recency weighting.
- Career profile exposes deterministic quality diagnostics endpoint.
- Scrape runs expose diagnostics endpoint (relaxation trail + source stats).
- Scrape runs now persist a DB-backed event timeline (`job_source_run_events`) and trace id for enqueue, heartbeat, callback, retry, cache-reuse, and stale-reconcile lifecycle inspection.
- Scrape schedules now persist a DB-backed execution timeline (`scrape_schedule_events`) so scheduler pickup and enqueue failures can be traced separately from run execution.
- Production support now has a read-only local toolkit (`tools/support`) that combines support endpoints with allowlisted Neon queries into one incident bundle.
- Scrape runs expose aggregated diagnostics summary endpoint (`/job-sources/runs/diagnostics/summary`).
- Scrape runs expose per-run event timeline endpoint (`GET /api/job-sources/runs/:id/events`).
- Scrape runs now also expose a DB-backed forensic audit timeline endpoint (`GET /api/job-sources/runs/:id/forensics`).
- Scrape diagnostics summary now supports optional timeline buckets (`hour` / `day`) and short-lived in-memory response cache.
- Scrape runs now persist deterministic lifecycle fields (`failure_type`, `finalized_at`, `retry_of_run_id`, `retry_count`).
- API lazily reconciles stale `PENDING/RUNNING` runs to terminal timeout failures.
- Failed scrape runs can be retried via `POST /job-sources/runs/:id/retry` with retry-chain linkage.
- Scrape run state transitions are now guard-railed by explicit lifecycle rules (`PENDING -> RUNNING|FAILED`, `RUNNING -> COMPLETED|FAILED`).
- Worker now emits authenticated scrape heartbeats to API (`/job-sources/runs/:id/heartbeat`) with lightweight progress payloads.
- Worker can now incrementally persist accepted offers to API during an active scrape (`/job-sources/runs/:id/offers`) so partial results survive later timeout/failure paths.
- Stale run reconciliation now prioritizes `last_heartbeat_at` over legacy timestamp-only heuristics.
- API scrape enqueue now applies short-window idempotency suppression for duplicate intents.
- API scrape enqueue now enforces per-user 24h enqueue budget guard (`SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER`).
- Shared `job_offers` catalog now persists `content_hash`, `quality_state`, `first_seen_at`, `last_seen_at`, and `last_matched_at` so scrape ingestion and reuse share one canonical store.
- `job_offers` remains the canonical current offer row, while `job_offer_source_observations` and `job_offer_raw_payloads` preserve what each scrape run actually saw.
- Multi-value offer dimensions now persist through relation tables (`job_offer_contract_types`, `job_offer_work_modes`, `job_offer_work_schedules`, `job_offer_seniority_levels`, `job_offer_technologies`) instead of staying trapped in `job_offers.details`.
- Catalog offer quality reasons now distinguish `listing_salvage`, `low_context`, `detail_partial`, `detail_full`, and missing required fields; richer later scrapes can upgrade older salvage rows for the same canonical offer.
- Catalog rematch now feeds deterministic matching with structured details from parsed offers instead of relying only on `job_offers.description`.
- Source-health rollups now include observation-backed coverage signals for missing employment type, empty requirements, source profile coverage, and apply URL coverage.
- `user_job_offers` now records `origin` (`SCRAPE`, `DB_REUSE`, `CATALOG_REMATCH`) and `match_version` for auditability of notebook links.
- Scrape enqueue now prefers fresh catalog rematch before worker dispatch when the active profile already has enough eligible offers in the shared catalog.
- Scrape enqueue now returns explicit reuse diagnostics (`accepted`, `insufficient-fresh-candidates`, `no-matchable-catalog-offers`, `no-cached-run`, `no-cached-offers`) for catalog-rematch and DB-reuse decisions.
- Career-profile READY/restore flows now trigger catalog rematch without forcing a new scrape.
- Automated scheduled scrapes now pause temporarily when recent runs indicate source-health degradation (`parse`/`network`/`callback`/`timeout` failure cluster).
- Scrape retry now enforces configurable retry-chain depth cap.
- Admin ops metrics endpoint available at `/ops/metrics`.
- Ops metrics now expose scrape lifecycle counters (`staleReconciledRuns`, `retriesTriggered`, `retrySuccessRate`).
- Ops metrics now expose callback event breakdown (`failuresByType`, `failuresByCode`) and heartbeat freshness indicator (`runningWithoutHeartbeat`).
- Ops metrics now support optional `windowHours` query override and scheduler reliability fields (`lastTriggerAt`, `dueSchedules`, `enqueueFailures24h`).
- Ops metrics callback section now includes retry/conflict indicators (`retryRate24h`, `conflictingPayloadEvents24h`).
- Ops now exposes catalog summary + targeted user rematch endpoints (`GET /api/ops/catalog/summary`, `POST /api/ops/catalog/rematch/users/:id`).
- Worker Cloud Tasks ingress now supports both static bearer auth and verified OIDC ID tokens (service account + audience).
- API worker callbacks now support OIDC bearer verification (audience + optional worker service-account email pinning) as an alternative to static callback token.
- Worker callback envelope now emits deterministic attempt metadata (`attemptNo`, `emittedAt`, `payloadHash`) for replay safety.
- API callback ingestion now rejects stale/out-of-order callback attempts and conflicting payload hashes for the same event id.
- Job offers now include deterministic `offer_identity_key` used for stable upserts on callback replays.
- Ops now exposes callback event listing, worker dead-letter replay trigger, and stale run reconcile endpoint.
- Ops now exposes token-protected bulk stale-run reconcile endpoint (`POST /api/ops/reconcile-stale-runs`) for scheduler automation.
- Ops support overview now includes recent schedule execution failures, and admins can list schedule events directly through `GET /api/ops/support/schedule-events`.
- Ops support overview now degrades partial sections safely instead of failing the whole bundle when one support query errors.
- Worker now persists DB-backed scrape execution events (`scrape_execution_events`) for task ingress, listing fetch, normalization, callback dispatch, and terminal failures.
- Worker scrape execution audit now also records callback retry scheduling, dead-letter moves, and dead-letter replay attempts/outcomes.
- Ops now exposes scrape forensic drill-down via `GET /api/ops/support/scrape-runs/:id/forensics`.
- Auth/runtime access control now resolves permissions from persisted `roles`, `permissions`, and `role_permissions` tables instead of relying only on inline role checks.
- OTP verification codes are now single-use and remain observable in persistence by being marked used instead of only being deleted after successful verification.
- Ops now exposes authorization audit listing via `GET /api/ops/authorization-events`.
- Ops now exposes CSV export for scrape forensics and authorization audit listings to support incident handoff.
- Admins can inspect and update user roles through `GET /api/user/admin/users/:id/role` and `PUT /api/user/admin/users/:id/role`.
- Scrape runs now persist normalized outcome fields directly on `job_source_runs` (`classified_outcome`, `empty_reason`, `source_quality`) so dashboards and support flows do not depend only on callback payload parsing.
- Admin ops endpoints are now skip-throttled and the web ops page uses the compact support overview bundle instead of several parallel diagnostics queries.
- Job matching now persists explanation metadata on each scored match (`job_matches.match_meta`) and exposes audit export endpoints.
- Documents now persist upload/extraction stage events (`document_events`) for diagnostics.
- Documents expose upload health and per-document diagnostics timeline endpoints.
- Documents now persist stage duration metrics (`document_stage_metrics`) and expose percentile summary endpoint (`/documents/diagnostics/summary`).
- Documents now persist extraction queue lease metadata on `documents` so queued work can be reclaimed deterministically instead of depending only on in-memory process state.
- Profile management page now includes direct document upload/confirm/extract flow with diagnostics visibility.
- New guided onboarding flow is available at `/onboarding` with persisted draft state and step-based UX.
- Profile input now supports structured intake payload (`intake_payload`) used for deterministic normalization.
- Main `/` workspace is notebook-first dashboard; users without ready profile are redirected to onboarding.
- Onboarding draft persistence now supports both local draft and server-side draft recovery (`/onboarding/draft`).
- Workspace summary read model (`/workspace/summary`) powers dashboard cards and onboarding guard decisions.
- Workspace summary supports optional in-memory ttl cache (`WORKSPACE_SUMMARY_CACHE_TTL_SEC`).
- Workspace summary now includes deterministic next-action, activity timeline, and readiness health signals for the product dashboard.
- Workspace summary now also exposes server-driven recovery guidance (`readinessBreakdown`, `blockerDetails`, `recommendedSequence`) for dashboard and notebook blocked states.
- Workspace blocker details now also declare affected surfaces (`blockedRoutes`) so notebook route gating can choose the right server-driven CTA instead of using a generic first blocker.
- Profile Studio now reuses the same recovery guidance so blocked document/profile-generation steps point to explicit next actions.
- API throttling is env-tunable through grouped read/write/auth/sensitive budgets (`API_*_THROTTLE_*`).
- Frontend query freshness/polling defaults are env-tunable (`NEXT_PUBLIC_QUERY_*`).
- Frontend runtime env guard now rejects localhost/non-https API/worker URLs in production.
- API error responses now expose normalized top-level fields (`code`, `message`, `requestId`, `timestamp`) with backward-compatible payload.
- API now persists structured endpoint warning/error diagnostics in `api_request_events` for DB-backed troubleshooting.
- API health now also verifies required operational tables such as `api_request_events` so migration drift is visible before support flows silently degrade.
- Production startup now fails fast when required operational tables are missing from the active database.
- API runtime now rejects retired Gemini 1.5 model defaults at boot and only accepts allowlisted Gemini model/location pairs.
- Vertex provider access/configuration failures now surface as stable AI-specific service errors instead of raw provider payload leakage.
- Legacy per-auth throttle env vars are optional migration fallbacks; new deployments should use `API_AUTH_THROTTLE_*`.
- Google OAuth login endpoint is available (`POST /api/auth/oauth/google`) with verified-id-token account linking.
- Successful login now persists `users.last_login_at`, and JWT validation rejects inactive or soft-deleted users immediately.
- Users can now soft-delete their own account through `DELETE /api/user`; sessions are revoked while operational history remains auditable.
- Scrape schedules are now persisted and available through:
  - `GET /api/job-sources/schedule`
  - `PUT /api/job-sources/schedule`
  - `POST /api/job-sources/schedule/trigger` (internal token-protected trigger)
- Scrape schedules now track deterministic `next_run_at`/`last_run_status`, and scheduler trigger processes only due schedules.
- Scheduler `next_run_at` calculation now respects weekday cron expressions instead of falling back to the default daily schedule for unsupported patterns.
- Production deploy now auto-upserts a Cloud Scheduler job for `/api/job-sources/schedule/trigger`.
- Production deploy now auto-upserts a second Cloud Scheduler job for `/api/ops/reconcile-stale-runs`.
- Production deploy can now also upsert a third Cloud Scheduler job for `/api/ops/dispatch-alerts` when `OPS_ALERTS_WEBHOOK_URL` is configured.
- Production deploy now converges Cloud Tasks queue retry policy on every rollout (main queue + reserved DLQ queue provisioning).
- Production bootstrap rejects wildcard CORS (`ALLOWED_ORIGINS=*`) in production mode.
- Notebook filter/view preferences are now persisted server-side and restored across sessions/devices.
- Notebook now exposes a dedicated summary read model (`GET /api/job-offers/summary`) for triage counts, quick actions, and explanation-tag rollups.
- Notebook summary now also exposes server-driven quick actions (including stale-untriaged focus) and notebook list filtering supports explicit attention queues such as `staleUntriaged`.
- Notebook now supports follow-up-aware filtering (`due` / `upcoming` / `none`) and exposes due/upcoming reminder counts in its summary payload.
- Notebook route gating now uses workspace summary readiness directly instead of duplicating the broader workflow query burst.
- Notebook now supports bulk follow-up metadata updates through `POST /api/job-offers/pipeline/bulk-follow-up`.
- Bulk follow-up updates now support shared follow-up notes and return a summary of due/upcoming/none outcomes for the affected selection.
- Dashboard now consumes a dedicated focus queue read model (`GET /api/job-offers/focus`) for follow-up due items, strict top matches, and fresh unscored leads.
- Dashboard focus queue entries now deep-link into notebook quick-action views with selected-offer context.
- Dashboard notebook focus stats now also deep-link into notebook quick-action views for unscored, strict-top, and follow-up queues.
- Scrape runs now support richer filtered history, CSV export, and per-source health summary endpoints.
- Admin ops now supports callback event CSV export and a private web ops console.
- Admin ops console now also exposes persisted API warning/error request events for support triage without direct DB access.
- Worker diagnostics now classify empty/degraded/blocked outcomes with explicit `resultKind`, `emptyReason`, and `sourceQuality` fields.
- Worker normalization now canonicalizes source aliases for employment type, work mode, and seniority before persistence/callback emission.
- Job-source health summary now includes outcome/failure rollups (`networkFailures`, `parseFailures`, `degradedRuns`, `partialSuccessRuns`, `blockedOutcomeRuns`, `filtersExhaustedRuns`, `detailParseGapRuns`).
- Job-source health summary now also exposes expiry capture coverage alongside employment type, requirements, source profile, and apply URL coverage.
- Documents now support authenticated extraction recovery endpoints (`POST /api/documents/:id/retry-extraction`, `POST /api/documents/retry-failed`) with audit events.
- Document retry responses now return explicit recovery outcome summaries so the UI can report what was recovered and what still needs attention.
- Job-source UX now exposes authenticated scrape preflight (`GET /api/job-sources/preflight`) and user-triggered schedule enqueue (`POST /api/job-sources/schedule/trigger-now`).
- Scrape preflight now returns user-facing blocker/warning details, guidance text, and schedule context in addition to raw readiness booleans.
- Local e2e fixture seeding now uses retry/backoff and smoke waits for service health before workflow assertions.
- Local e2e fixture seeding now also resets stale fixture `PENDING`/`RUNNING` scrape runs so smoke starts from a deterministic state.
- Release candidate, deploy-on-main, and manual promotion workflows now upload machine-readable release metadata and verification artifacts containing resolved service revision/image details.
- Rollback workflow summary now records rollback source/target revisions and images for auditability.

## Data Model Highlights

`career_profiles` stores:

- canonical JSON: `content_json`
- readable markdown: `content`
- denormalized query fields:
  - `primary_seniority`
  - `target_roles`
  - `searchable_keywords`
  - `searchable_technologies`
  - `preferred_work_modes`
  - `preferred_employment_types`

`job_matches` now stores:

- deterministic score summary fields (`score`, `is_match`, matched arrays)
- persisted explanation metadata: `match_meta` (engine/audit/breakdown/violations)

## New API Read Model

- `GET /api/career-profiles/search-view`
- `GET /api/workspace/summary`
- `GET /api/job-offers/preferences`
- `PUT /api/job-offers/preferences`
- `GET /api/job-matching/audit`
- `GET /api/job-matching/audit/export.csv`
- `GET /api/documents/diagnostics/summary`
- `GET /api/job-sources/sources/health`
- `GET /api/job-sources/runs/export.csv`
- `GET /api/ops/scrape/callback-events/export.csv`
- `GET /api/job-offers/summary`
- Purpose:
  - fast filtering without parsing `content_json`
  - FE/tester support for profile diagnostics and search-readiness checks
  - dashboard aggregation with one API request
  - support/debug audit export for match explanations

## Current Risks / Gaps

- Global API throttling defaults are safer now, but aggressive overrides can still interfere with intensive manual test loops.
- Some e2e scenarios still rely on live external scraping source behavior.
- Frontend standards are now explicitly documented in `docs/06_engineering_standards/01_frontend_standards.md`; continue enforcing via ESLint and reviews.
- Worker queue is still in-memory (acceptable for now, not crash-resilient across process restarts).
- Matching remains trust-first, uses richer structured catalog inputs, treats secondary candidate seniority as allowed seniority, and avoids hard-blocking ambiguous text-only seniority signals.
- CI now uses split quality gates (`CI Verify`, `Smoke Gate`) and release candidate + manual promote workflows.
- CI Verify and Smoke Gate now use cancel-in-progress concurrency to avoid duplicate billable runs on rapid pushes.
- Web Playwright e2e now runs in isolated `CI Verify / web-e2e` heavy validation on `dev`, `master`, and pull requests.
- Release candidate now builds and pushes api/worker/web container images to GCP Artifact Registry.
- Manual production promotion now deploys pinned SHA images to Cloud Run and runs post-deploy health verification.
- Deployment verification now uses retry-based service probes and emits machine-readable summary artifacts.
- Web production runtime now binds `0.0.0.0:$PORT` for Cloud Run compatibility.
- Worker runtime now prioritizes Cloud Run `PORT` with local fallback to `WORKER_PORT`.
- Canonical deployment/runtime env+secret contract is documented in `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md`.
- New table `job_source_run_attempts` captures per-run attempt outcomes for deterministic callback auditing.
- Recovery and automation smoke still require local API/worker/web services to be started before the readiness probes can succeed.
- Neon or branch-specific migration drift can still happen operationally, but it is now surfaced through `/health` and startup validation instead of remaining silent until support endpoints are queried.
- Multi-source expansion is still more of a plan than a proven capability; only selective source growth is justified right now.
- Scrape completion is improving, but "completed" does not automatically mean "user got useful notebook value" unless linking, ranking, and visibility remain strong.
- Running scrapes now persist accepted offers incrementally, so timeout/finalization issues no longer imply full result loss by default.
- Late scrape callbacks after stale-run recovery now return a stable idempotency reason instead of reopening or duplicating recovered notebook links.
- Weekday schedule cron expressions are now computed correctly with timezone-aware next-run calculation.
- Production scheduler deadline drift root cause is now fixed: Cloud Scheduler `attemptDeadline` values were too short for real Cloud Run handler latency, so deploy automation and live jobs now use longer deadlines and no longer report false timeout failures while enqueue succeeds.
- Worker source orchestration now has an explicit adapter boundary for future non-Pracuj sources, but only Pracuj is production-ready.
- Web schedule planning now explains schedule trust states more explicitly (`off`, `enabled but not yet proven`, `recent failure`, `due but paused`, `waiting for next window`) using product-facing schedule state, and the broader end-user/admin boundary cleanup audit is complete and archived.
- Company discovery read APIs are now test-covered for search/location filtering and linked-offer summary fields.
- Offer scoring remains deterministic-only in the active match path, with explicit tests preventing fallback to per-offer LLM scoring.
- Root dependency audit gate now targets critical advisories first; `axios` is pinned at `>=1.15.0` to clear the current SSRF blocker from `verify:prepush`.
- Production deploy now injects GitHub-managed runtime secrets directly into Cloud Run env vars; Secret Manager is no longer part of the default deploy path in order to cut fixed GCP cost.

## Highest-Value Remaining Gaps

- Local smoke is now self-starting for API/worker/web, but CI/local orchestration still depends on host Docker/Postgres availability.
- Worker queue remains in-memory, so crash resilience is below production-grade background-job expectations.
- Scraper quality is still heavily tied to one source and its DOM behavior.
- Pracuj parser reliability is stronger for rendered detail pages and source heading drift, but source HTML drift is still the dominant scraper risk.
- Notebook productivity is better, but deeper long-tail pipeline automation is still incomplete.
- Reminder delivery now exists for email and is visible in product/ops surfaces, but user controls and broader notification channels are still missing.
- Document recovery exists, and extraction/profile-generation now expose DB-visible async lifecycle state, but worker queue durability is still below production-grade background-job expectations.
- Support surfaces are present, but alerting and long-horizon observability are still limited.
- Frontend workflow structure and query hygiene are materially stronger on the core workspace routes, but some older and secondary surfaces still need the same flatter composition discipline.
- Product/admin role boundaries are materially cleaner on end-user routes, but long-term enforcement still depends on keeping future diagnostics work inside admin/support surfaces.

## Strategic Next Focus

The next phase should optimize for product usefulness, not feature count.

Priority order:

1. make notebook triage and follow-up clearly superior to using the source platforms directly
2. keep scrape outcomes reliable enough that the workflow can be trusted
3. add sources selectively only when they expand useful supply with manageable support cost
4. improve durable async execution and long-horizon observability before broad source expansion

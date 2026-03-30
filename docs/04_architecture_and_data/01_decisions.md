# Decisions

Last updated: 2026-03-30

## Purpose

This document records major architectural, contract, and implementation-boundary decisions.

Use it to explain why the system is shaped a certain way, not to restate implementation details already visible in code.

ADR-lite log for major architectural and contract decisions.

## 2026-03-22: Scraping Is Acquisition Infrastructure, Not The Product

- Decision:
  - Treat scraping as a source-acquisition layer, not as the application's primary user value.
  - Prioritize notebook workflow, ranking, deduplication, follow-up, and application support over raw source count.
  - Add new sources selectively and only when maintainability and supportability are acceptable.
- Why:
  - A product that only mirrors listings from external boards is strategically weak.
  - Each additional source increases parser, anti-bot, support, and ops cost.
  - The app becomes defensible only if it helps users act better across sources than native platforms do individually.

## 2026-03-23: Adaptive Broad-Acquisition Query Planning For Pracuj

- Decision:
  - Stop deriving narrow source queries directly from the full candidate profile.
  - Split scrape intent into:
    - broad acquisition filters for source query planning
    - richer matching filters for post-scrape ranking, notebook gating, and optional adaptive narrowing
  - For Pracuj, target a listing window of roughly `20-40` candidates before detail fetch begins.
  - Keep catalog ingestion broader than notebook projection.
- Why:
  - Exact-profile source queries were returning too few listings while still producing "healthy" scrape runs.
  - A shared catalog benefits from broader acquisition even when strict notebook mode remains conservative.
  - Adaptive probing makes under-fetching explainable and reduces dependence on brittle keyword-first source queries.

## 2026-03-24: Scrape Reliability Means Predictable, Observable, And Graceful

- Decision:
  - Do not treat scrape reliability as "every run succeeds".
  - Treat a scrape run as working correctly when it is understandable, observable, and failure-tolerant.
  - Extend run diagnostics with:
    - artifact manifest metadata
    - stage metrics
    - silent-failure detection
    - human-readable run story and recommended next action
- Why:
  - A completed scrape with zero usable offers is not a healthy success.
  - Source blocking and browser fallback make deterministic perfect-success expectations unrealistic.
  - The product must explain what happened in prod without requiring log archaeology.

## 2026-03-30: Phase-1 Catalog Standardization Uses Company And Taxonomy Core

- Decision:
  - Start catalog standardization with a small reusable entity layer:
    - `companies`
    - `company_aliases`
    - `job_categories`
    - `employment_types`
    - `contract_types`
    - `work_modes`
  - Extend `job_offers` with nullable normalized foreign keys for those entities.
  - Keep raw source snapshot fields during migration instead of replacing them immediately.
- Why:
  - Matching and query logic should gradually move from substring scans toward SQL-backed structured fields.
  - The phase-1 model must support future non-IT domains, so taxonomy should stay domain-neutral.
  - Keeping raw snapshot fields reduces migration risk and preserves offer-history context.

## 2026-02-21: Canonical Career Profile Schema

- Decision:
  - Use one strict JSON schema (`schemaVersion: "1.0.0"`) for generated career profiles.
  - Remove temporary dual-read/version-bridge logic before first production release.
- Why:
  - Better consistency for matching and scrape-filter derivation.
  - Less maintenance overhead than parallel schema support.

## 2026-02-21: Write-Through Denormalized Profile Projection

- Decision:
  - Persist selected query-critical profile fields into explicit DB columns in `career_profiles`.
  - Keep `content_json` as full canonical source.
- Why:
  - Faster read/filter use-cases.
  - Simpler and safer FE/read-model queries.
  - Avoid repeated JSON parsing for hot paths.

## 2026-02-21: Search-View Endpoint

- Decision:
  - Add `GET /api/career-profiles/search-view` over denormalized columns.
- Why:
  - Provide stable query API for FE/testing.
  - Enable filterable profile diagnostics (`seniority`, `role`, `keyword`, `technology`).

## 2026-02-21: Scraper Zero-Results and Recommended Offers Handling

- Decision:
  - Exclude `section-recommended-offers` from primary scrape targets.
  - Detect `zero-offers-section` and progressively relax filters to reach target offer count.
- Why:
  - Prevent irrelevant recommendations from polluting scrape results.
  - Maintain useful output when strict filters return zero listings.

## 2026-02-21: Seniority Constraint in Deterministic Matching

- Decision:
  - Treat seniority mismatch (job above candidate primary seniority) as hard constraint violation.
- Why:
  - Avoid low-trust match outcomes (e.g., junior candidates matched to senior-only roles).

## 2026-02-23: Request Payload Guardrails (API + Worker)

- Decision:
  - Add environment-driven request body size limits:
    - API: `API_BODY_LIMIT`
    - Worker: `WORKER_MAX_BODY_BYTES`
- Why:
  - Reduce memory abuse and accidental oversized payload failures.
  - Keep ingress behavior explicit and configurable by environment.

## 2026-02-23: Source-Specific Listing URL Allowlist

- Decision:
  - Validate scrape `listingUrl` host/protocol in API before worker enqueue.
  - For `pracuj-pl*` sources, permit only `pracuj.pl` and subdomains.
- Why:
  - Prevent SSRF-style misuse and accidental scraping of unsupported domains.
  - Keep API-to-worker contract bounded to known source adapters.

## 2026-02-23: Callback Retry Strategy Upgrade

- Decision:
  - Use exponential backoff with jitter and max-delay cap for worker callback retries.
  - Add env controls:
    - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
    - `WORKER_CALLBACK_RETRY_JITTER_PCT`
- Why:
  - Lower retry synchronization spikes.
  - Improve callback reliability without unbounded delay growth.

## 2026-02-23: Web E2E Coverage as CI Gate

- Decision:
  - Run full web Playwright e2e suite in CI (not only a single notebook spec).
- Why:
  - Catch cross-page integration regressions early.
  - Keep internal tester and profile management flows continuously validated.

## 2026-02-24: Notebook Ranking Modes

- Decision:
  - Add mode-driven ranking on `GET /job-offers`:
    - `strict` (default): only scored offers without hard-constraint violations.
    - `approx`: broader set with deterministic violation penalties.
    - `explore`: discovery-oriented ordering.
- Why:
  - Improve trust by default while still supporting discovery workflows.
  - Keep ranking behavior explicit and testable.

## 2026-02-24: Deterministic Profile Quality Read Model

- Decision:
  - Add `GET /career-profiles/quality` returning deterministic completeness signals and recommendations.
- Why:
  - Make profile readiness measurable before matching/scraping.
  - Reduce black-box behavior in profile generation flow.

## 2026-02-24: Scrape Run Diagnostics Endpoint

- Decision:
  - Extend worker callback payload with diagnostics and expose run-level diagnostics at
    `GET /job-sources/runs/:id/diagnostics`.
- Why:
  - Improve scrape observability (filter relaxation, blocked pages, link discovery stats).
  - Provide support/debug transparency without requiring raw artifact inspection.

## 2026-02-24: Persistent Document Stage Diagnostics

- Decision:
  - Persist document upload/extraction timeline events in DB (`document_events`).
  - Expose diagnostics at `GET /documents/:id/events`.
- Why:
  - File logs alone are insufficient for per-user troubleshooting and FE visibility.
  - Durable event trails improve supportability across restarts and environments.

## 2026-02-24: Upload Capability Health Endpoint

- Decision:
  - Add `GET /documents/upload-health` to check bucket access and signed URL generation capability.
- Why:
  - Fast root-cause detection for upload failures (credentials/CORS/signing/storage issues).
  - Enables FE to surface actionable environment diagnostics to users/developers.

## 2026-02-25: Structured Onboarding Intake Payload

- Decision:
  - Extend `profile_inputs` with `intake_payload` (jsonb) and accept structured onboarding payload on `POST /profile-inputs`.
  - Keep `target_roles` and `notes` materialized for backward compatibility/readability.
- Why:
  - Richer deterministic normalization and better prompt context for profile generation.
  - Enables step-by-step UX without collapsing user intent into one free-text field.

## 2026-02-25: Guided Onboarding + Notebook-First App Entry

- Decision:
  - Add `/onboarding` as primary guided flow (preferences -> documents -> review/generate).
  - Route users without ready profile from `/` to onboarding.
  - Keep `/` focused on notebook-first dashboard summary.
- Why:
  - Reduces cognitive load from panel-heavy internal-tool layout.
  - Aligns product UX with user journey and improves completion rate.

## 2026-02-25: Server-Side Onboarding Draft Recovery

- Decision:
  - Add `onboarding_drafts` table and authenticated draft endpoints:
    - `GET /onboarding/draft`
    - `PUT /onboarding/draft`
    - `DELETE /onboarding/draft`
  - Keep local persisted draft in FE and add server draft as cross-device fallback.
- Why:
  - Prevent data loss across browsers/devices.
  - Improve onboarding completion reliability without over-coupling to localStorage.

## 2026-02-25: Workspace Summary Read Model

- Decision:
  - Add `GET /workspace/summary` to aggregate dashboard cards + onboarding guard state.
- Why:
  - Replace multiple dashboard queries with one deterministic read model.
  - Reduce frontend orchestration complexity and inconsistent loading states.

## 2026-02-27: Persistent Document Stage Duration Metrics

- Decision:
  - Add `document_stage_metrics` table for durable timing samples across document lifecycle stages.
  - Persist stage durations when document events reach terminal milestones.
  - Expose aggregated percentile diagnostics at `GET /documents/diagnostics/summary`.
- Why:
  - Timeline events alone are noisy for trend analysis and support triage.
  - Percentile summaries enable reliable UX/read-model cards and operational diagnostics.

## 2026-02-27: Scrape Diagnostics Summary Timeline Buckets

- Decision:
  - Extend `GET /job-sources/runs/diagnostics/summary` with optional timeline buckets:
    - `includeTimeline=true`
    - `bucket=hour|day`
  - Add short-lived in-memory cache for repeated summary requests.
- Why:
  - Improve visibility of scrape reliability trends over longer windows.
  - Reduce repeated aggregation cost during dashboard polling.

## 2026-02-27: Notebook Ranking Calibration Guardrails

- Decision:
  - Cap `approx` mode hard-constraint penalties with `NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY`.
  - Add configurable explore-mode recency weighting via `NOTEBOOK_EXPLORE_RECENCY_WEIGHT`.
  - Keep `strict` mode trust-first behavior unchanged.
- Why:
  - Prevent over-penalization in `approx` while preserving deterministic ranking behavior.
  - Make `explore` ordering predictable and tuneable without changing strict trust semantics.

## 2026-02-27: Scrape Run Lifecycle Reconciliation and Retry Chain

- Decision:
  - Extend `job_source_runs` with lifecycle fields:
    - `failure_type`
    - `finalized_at`
    - `retry_of_run_id`
    - `retry_count`
  - Reconcile stale `PENDING/RUNNING` runs lazily in API read/enqueue paths to terminal timeout failure.
  - Add retry endpoint `POST /job-sources/runs/:id/retry` for failed runs only.
- Why:
  - Prevent indefinite non-terminal runs that block user workflows and distort queue metrics.
  - Preserve deterministic lifecycle auditability for support/ops.
  - Enable explicit user recovery path without mutating original failed runs.

## 2026-02-27: Worker-to-API Failure Taxonomy Contract

- Decision:
  - Extend worker callback payload with explicit:
    - `failureType`
    - `failureCode`
  - API persists `failure_type` and uses worker-provided value with legacy message-based fallback.
- Why:
  - Reduce fragility from regex-based error parsing.
  - Improve consistency of diagnostics and ops metrics across callback paths.

## 2026-03-01: Scrape Run Transition State Machine

- Decision:
  - Enforce explicit run lifecycle transitions only:
    - `PENDING -> RUNNING|FAILED`
    - `RUNNING -> COMPLETED|FAILED`
  - Reject invalid transitions deterministically in API service orchestration.
- Why:
  - Prevent silent lifecycle drift and contradictory terminal states.
  - Keep retry/reconciliation/diagnostics logic coherent and auditable.

## 2026-03-01: Worker Heartbeat Progress Contract

- Decision:
  - Add authenticated worker heartbeat callback:
    - `POST /job-sources/runs/:id/heartbeat`
  - Persist `job_source_runs.last_heartbeat_at` and lightweight `progress` payload.
  - Reconcile stale runs using heartbeat-aware thresholds.
- Why:
  - Improve stale-run detection accuracy for long-running scrape jobs.
  - Provide deterministic visibility into in-flight run phases without final callback wait.

## 2026-03-13: Scrape Trace Id and Run Event Ledger

- Decision:
  - Add `job_source_runs.trace_id` for end-to-end scrape correlation.
  - Add `job_source_run_events` for persisted lifecycle events across enqueue, dispatch, heartbeat, callback, retry, cache reuse, and stale reconciliation.
  - Expose `GET /job-sources/runs/:id/events` and enrich `GET /job-sources/runs/:id/diagnostics` with callback and last-event metadata.
- Why:
  - Make stale-run and callback-debug workflows supportable from DB-backed diagnostics.
  - Keep scrape observability vendor-agnostic and easier to audit during incident response.

## 2026-03-13: Read-Only Production Support Toolkit

- Decision:
  - Add read-only admin support endpoints under `/ops/support/*`.
  - Add a local-only support toolkit under `tools/support/` that combines those API bundles with allowlisted read-only Neon queries.
  - Keep live support config and exported bundles outside git under `.support-local/`.
- Why:
  - Let engineers and LLM sessions diagnose production incidents from one deterministic artifact instead of manual API/DB copy-paste.
  - Improve production debugging speed without granting mutation capability to support tooling.

## 2026-03-14: Separate Schedule Execution Ledger

- Decision:
  - Add `scrape_schedule_events` as a DB-backed scheduler ledger distinct from `job_source_run_events`.
  - Persist schedule update, trigger, enqueue success, and enqueue failure events with optional `sourceRunId`, `traceId`, and `requestId`.
  - Expose admin listing at `GET /ops/support/schedule-events`.
- Why:
  - Scheduling failures need to be debugged separately from worker execution failures.
  - Support should be able to answer "did the scheduler fail, or did the worker fail?" from one deterministic data source.

## 2026-03-14: Immediate Account Revocation via Soft Delete

- Decision:
  - Update `users.last_login_at` on successful login.
  - Add soft-delete self-service endpoint `DELETE /user`.
  - Revoke sessions on delete and reject inactive/deleted users during JWT validation and refresh.
- Why:
  - Support and ops need trustworthy account activity metadata.
  - Soft-deleted users should lose access immediately without destroying historical operational evidence.

## 2026-03-14: Compact Admin Ops Snapshot as Primary Diagnostics Read Model

- Decision:
  - Make `GET /ops/support/overview` the primary admin diagnostics payload.
  - Reduce admin FE fan-out by using one support snapshot query instead of multiple automatically refreshed datasets.
  - Skip global throttling on authenticated admin ops endpoints.
- Why:
  - The ops UI should not contribute meaningfully to `429` pressure while debugging incidents.
  - Compact support bundles are easier for both humans and LLM sessions to reason about than many loosely correlated queries.

## 2026-03-01: Query Path Index Reinforcement for Notebook/Matching

- Decision:
  - Add targeted indexes for hot read patterns across:
    - `job_source_runs`
    - `user_job_offers`
    - `job_matches`
    - `job_offers`
- Why:
  - Reduce latency variance under larger user/run histories.
  - Keep notebook/matching read models predictable with current architecture.

## 2026-03-01: CI Gate Split + Staging Release Candidate Workflow

- Decision:
  - Replace monolithic CI with split workflows:
    - `CI Verify` (lint/typecheck/tests/build/e2e)
    - `Smoke Gate` (cross-service smoke)
  - Add `Release Candidate` workflow and manual `Promote To Prod` workflow.
- Why:
  - Improve failure isolation and debugging speed.
  - Enforce release artifact traceability before production promotion.

## 2026-03-01: Scrape Enqueue Idempotency + Retry Depth Guard

- Decision:
  - Add short-window enqueue idempotency suppression keyed by user+intent fingerprint.
  - Add configurable max retry chain depth guard for scrape reruns.
- Why:
  - Prevent duplicate active run storms under client retry spikes.
  - Avoid unbounded retry chains that degrade throughput and supportability.

## 2026-03-01: Cloud Tasks Production Contract Tightening

- Decision:
  - Require Cloud Tasks auth configuration for provider mode:
    - static bearer token via `TASKS_AUTH_TOKEN`, or
    - OIDC identity via `TASKS_SERVICE_ACCOUNT_EMAIL`.
  - Worker task endpoint accepts either static token auth or verified Cloud Tasks OIDC ID tokens.
  - Support explicit OIDC audience override with `TASKS_OIDC_AUDIENCE` (fallback to `TASKS_URL`).
  - Require `TASKS_URL` to end with `/tasks` or `/scrape` and enforce `https` in production.
  - Emit provider telemetry (`queueProvider`, `taskId`, `payloadBytes`) at enqueue.
- Why:
  - Reduce misconfiguration risk in production deployments.
  - Improve traceability for queue dispatch incidents.

## 2026-03-01: GCP Release Candidate and Manual Cloud Run Promotion

- Decision:
  - Build and push `api`, `worker`, and `web` images to Artifact Registry in release-candidate workflow.
  - Promote to production by manually deploying pinned SHA images to Cloud Run.
  - Run post-deploy health verification script across web/api/worker endpoints.
- Why:
  - Ensure artifact immutability between staging and production.
  - Keep production promotion operator-controlled and auditable.

## 2026-03-01: Worker Callback OIDC Authentication for API

- Decision:
  - Support OIDC verification for worker callback endpoints (`/job-sources/complete`, `/job-sources/runs/:id/heartbeat`) using:
    - `WORKER_CALLBACK_OIDC_AUDIENCE`
    - optional `WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL` claim pinning.
  - Keep static `WORKER_CALLBACK_TOKEN` support for local/dev compatibility.
  - Worker callback sender mints outbound ID token headers when `WORKER_CALLBACK_OIDC_AUDIENCE` is configured.
- Why:
  - Remove shared static callback token requirement in Cloud Run service-to-service calls.
  - Improve production secret hygiene while preserving deterministic callback authentication.

## 2026-03-02: Cloud Run Runtime Port/Host Contract Hardening

- Decision:
  - Web production start must bind `0.0.0.0` and use Cloud Run `PORT` dynamically.
  - Worker runtime must prefer Cloud Run `PORT` when present, with `WORKER_PORT` as local fallback.
  - Production promotion workflow validates full release SHA format and enforces `https` deployment base URLs.
- Why:
  - Prevent startup failures caused by fixed localhost/port assumptions in managed runtime.
  - Reduce production rollout errors by failing fast on invalid promotion inputs.

## 2026-03-02: Canonical GCP Deploy Matrix

- Decision:
  - Introduce `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md` as the single source of truth for:
    - repository-level CI/CD variables and secrets
    - service-level runtime env and secret mapping
    - Cloud Run baseline settings and rollout sequence
- Why:
  - Reduce deployment drift between docs, workflows, and Cloud Run configuration.
  - Make first and repeat promotions deterministic and easier to audit.

## 2026-03-03: Deterministic Callback Attempt Contract + Offer Identity Key

- Decision:
  - Extend worker callback envelope with deterministic attempt metadata:
    - `attemptNo`
    - `emittedAt`
    - `payloadHash` (SHA-256 over canonical payload).
  - API callback ingestion rejects:
    - stale attempt numbers (`STALE_ATTEMPT`)
    - out-of-order jumps (`ATTEMPT_ORDER_VIOLATION`)
    - duplicate event ids with conflicting payload hash (`CONFLICTING_EVENT_PAYLOAD`).
  - Add `job_source_run_attempts` ledger for per-run attempt outcomes.
  - Add `job_offers.offer_identity_key` and use it for deterministic offer upsert conflict target.
  - Add admin ops controls for callback events listing, worker dead-letter replay trigger, and stale run reconcile.
- Why:
  - Make callback replay behavior deterministic and audit-friendly.
  - Eliminate callback race ambiguity for terminal run outcomes.
  - Improve operational recovery without direct DB/manual intervention.

## 2026-03-05: Config-Driven Request Budget Guardrails (API + Web)

- Decision:
  - Make global API throttling env-configurable via:
    - `API_THROTTLE_TTL_MS`
    - `API_THROTTLE_LIMIT`
  - Make frontend React Query traffic defaults env-configurable via:
    - `NEXT_PUBLIC_QUERY_STALE_TIME_MS`
    - `NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS`
    - `NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS`
  - Keep production Cloud Run baseline at `min-instances=0` for all services.
- Why:
  - Reduce production request churn/cost while preserving explicit control over freshness.
  - Avoid hardcoded global throttle values that block admin/testing loops or require code edits per environment.
  - Keep runtime tuning aligned with low-cost cold-start strategy.

## 2026-03-05: Normalized API Error Taxonomy Contract

- Decision:
  - Standardize API error responses to include top-level fields:
    - `code`
    - `message`
    - `requestId`
    - `timestamp`
  - Keep legacy nested `error/meta` payload for backward compatibility.
- Why:
  - Make frontend error handling deterministic and less string-dependent.
  - Improve debugging with consistent request correlation id exposure.

## 2026-03-10: DB-Backed API Request Diagnostics

- Decision:
  - Persist structured API warning/error events in `api_request_events`.
  - Write rows centrally from the global exception filter and from a response interceptor when successful endpoints return `warning` or `warnings`.
- Why:
  - Keep per-endpoint troubleshooting durable across restarts and Cloud Run log rotation.
  - Provide request-correlated diagnostics without mirroring every raw application log line into Postgres.

## 2026-03-05: Google OAuth + Schedule Trigger Auth

- Decision:
  - Add Google OAuth id-token login endpoint (`POST /auth/oauth/google`) with verified email requirement and account linking by email.
  - Add token-protected scheduler trigger endpoint for scrape schedule automation (`POST /job-sources/schedule/trigger`).
- Why:
  - Reduce auth friction and support social sign-in onboarding.
  - Enable controlled scrape automation without exposing unauthenticated trigger surfaces.

## 2026-03-09: Persisted Notebook Preferences

- Decision:
  - Persist notebook filters/view mode and saved preset per user in a dedicated `notebook_preferences` table.
  - Hydrate the notebook UI from the server copy and keep the frontend store synchronized after changes.
- Why:
  - Preserve triage context across devices and sessions.
  - Avoid keeping product workflow state only in ephemeral browser memory.

## 2026-03-09: Workspace Summary Drives Product Next Actions

- Decision:
  - Extend `GET /workspace/summary` with `nextAction`, `activity`, and `health` sections.
- Why:
  - Keep dashboard UX driven by one deterministic read model instead of frontend heuristics.
  - Make readiness and operating guidance explicit and testable.

## 2026-03-09: First-Class Scrape History and Export Surfaces

- Decision:
  - Extend scrape run listing with richer filters/windowing.
  - Add CSV export for user run history and admin callback event history.
  - Add `GET /job-sources/sources/health` for source-level reliability summary.
- Why:
  - Support debugging and ops workflows without direct DB access or raw log inspection.
  - Make operational visibility consumable from product/admin UI.

## 2026-03-09: Worker Diagnostics Outcome Classification

- Decision:
  - Extend worker callback diagnostics with `resultKind`, `emptyReason`, and `sourceQuality`.
- Why:
  - Separate “source degraded/blocked/empty” outcomes from generic failures.
  - Reduce support dependence on string-parsing worker logs.

## 2026-03-09: Server-Driven Workflow Recovery Guidance

- Decision:
  - Extend `GET /workspace/summary` with:
    - `readinessBreakdown`
    - `blockerDetails`
    - `recommendedSequence`
  - Use the same payload to drive dashboard and notebook blocked states.
  - Reuse the same payload for private-shell notebook visibility so private routes do not mount the heavier workflow query bundle just to decide nav state.
- Why:
  - Keep workflow guidance deterministic and API-owned.
  - Remove duplicate blocker heuristics from the frontend.

## 2026-03-09: Document Extraction Retry as First-Class Recovery Flow

- Decision:
  - Add authenticated recovery endpoints:
    - `POST /documents/:id/retry-extraction`
    - `POST /documents/retry-failed`
  - Persist a document event when extraction retry is requested.
- Why:
  - Let users recover from failed document extraction without support intervention.
  - Keep retry actions auditable in the existing diagnostics timeline.

## 2026-03-09: User-Facing Scrape Preflight and Manual Schedule Trigger

- Decision:
  - Add `GET /job-sources/preflight` to resolve blockers, warnings, and accepted filters before enqueue.
  - Add authenticated `POST /job-sources/schedule/trigger-now` for immediate run of an enabled personal schedule.
- Why:
  - Make scrape readiness explicit before the user starts a run.
  - Expose automation controls in-product without relying on internal-only scheduler endpoints.

## 2026-03-09: Notebook Triage Summary Read Model

- Decision:
  - Add `GET /job-offers/summary` with counts for unscored, high-confidence, stale buckets, and top explanation tags.
  - Derive summary tags from the same strict ranking logic used by the notebook list.
- Why:
  - Speed up notebook triage with deterministic quick-action entry points.
  - Avoid divergence between list ranking behavior and summary cards.

## 2026-03-09: Smoke Harness Readiness-First Behavior

- Decision:
  - Add retry/backoff to `seed:e2e`.
  - Make `scripts/smoke-e2e.ps1` wait for API, worker, and web health before running workflow assertions.
  - Extend smoke assertions to cover recovery guidance, document retry, schedule/preflight, notebook summary, and schedule trigger-now.
- Why:
  - Reduce false negatives caused by startup races.
  - Keep smoke aligned with the current user workflow instead of only legacy endpoints.

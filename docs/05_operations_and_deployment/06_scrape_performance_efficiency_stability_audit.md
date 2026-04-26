# Scrape Performance Efficiency Stability Audit

Last updated: 2026-04-16

## Purpose

This document audits the current scraping process for performance, efficiency, and stability.

It describes current strengths, concrete findings, and proposed improvements for the scrape path across:

- `apps/api/src/features/job-sources`
- `apps/worker/src/jobs`
- `apps/worker/src/queue`
- `apps/worker/src/http`
- `apps/worker/src/sources/pracuj-pl`
- `apps/worker/src/db`
- `packages/db/src/schema/job-source-runs.ts`
- `packages/db/src/schema/job-source-run-events.ts`
- `packages/db/src/schema/job-source-callback-events.ts`
- `packages/db/src/schema/scrape-execution-events.ts`

## Reference Docs

This audit is based on the current docs direction in:

- `README.md`
- `docs/01_project_context/01_codex_handoff.md`
- `docs/01_project_context/02_project_state.md`
- `docs/02_product_workflows/20_scrape_feature.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/99_archive_legacy/06_scrape_reliability_and_catalog_audit_plan.md`
- `docs/04_architecture_and_data/01_decisions.md`
- `docs/05_operations_and_deployment/01_runbook.md`

## Executive Summary

The scraping process is much stronger than a basic scraper. It already has profile-derived query planning, catalog reuse, source-health backoff, heartbeat callbacks, incremental offer ingestion, callback replay safety, diagnostic summaries, forensic timelines, and stale-run reconciliation.

The main gap is no longer visibility. The main gap is execution durability and budget control.

Highest-priority improvements:

1. Make worker task execution truly durable and deadline-aware instead of relying on in-process task state.
2. Align Cloud Tasks dispatch deadlines, worker task deadlines, callback retry budgets, and API stale-run thresholds.
3. Add retry/dead-letter behavior for incremental offer ingestion, not only terminal callbacks.
4. Separate scrape attempt metadata from callback delivery attempt metadata.
5. Finish the source-adapter boundary before adding another source.
6. Add alerting on existing diagnostics so silent failure, source degradation, callback dead letters, and stale runs become proactive signals.

## Implementation Status

Implemented on 2026-04-16:

1. Task deadline metadata is now explicit:
   - `WORKER_TASK_TIMEOUT_MS`
   - `WORKER_TASK_DISPATCH_DEADLINE_MS`
   - validation that dispatch deadline exceeds worker timeout
   - validation that stale-running reconciliation exceeds dispatch deadline
2. Cloud Tasks dispatch now sends an explicit dispatch deadline.
3. Worker task payloads now carry `taskId`, `dedupeKey`, `taskTimeoutMs`, `dispatchDeadlineMs`, `leaseExpiresAt`, and `ingestUrl`.
4. `scrape_execution_events` now stores task correlation and deadline fields:
   - `task_id`
   - `dedupe_key`
   - `lease_expires_at`
   - `execution_status`
5. Worker task execution now supports cooperative cancellation from `TaskRunner` into `runScrapeJob`.
6. Incremental offer ingest now retries with bounded exponential backoff and jitter.
7. Terminal callback and incremental ingest metadata now distinguish scrape/pipeline attempts from callback delivery attempts.
8. Callback payload hash fallback now excludes delivery-attempt-only fields.
9. API exposes batch incremental ingest at `POST /api/job-sources/runs/:id/offers/batch`.
10. Source pipeline stages now use the resolved adapter instead of hard-coded `pracuj-pl` internals.
11. `job_source_runs` now stores `canonical_listing_url`, and scrape intent fingerprinting canonicalizes listing URLs.
12. Worker ingress now refuses duplicate active executions for the same `sourceRunId` while the latest active lease is still valid.
13. Incremental offer ingest failures now move a batch payload into the worker dead-letter path, so the existing replay endpoint can retry delivery.
14. Worker incremental offer delivery now uses the batch endpoint instead of serial per-offer callbacks.
15. Ops metrics now surface callback dead letters, incremental ingest dead letters, source degradation, stale-run, and scheduler-enqueue alert flags.
16. Focused coverage was added for env deadline validation, callback hash stability, batch incremental ingest payloads, extended task metadata, and adapter-specific pipeline stages.

Remaining follow-up work:

1. Move active lease ownership from event-derived state to an atomic task-execution table if high-concurrency duplicate prevention becomes necessary.
2. Wire the new ops alert flags into the production alerting provider and notification channels.
3. Add smoke/e2e coverage that exercises Cloud Tasks dispatch, batch incremental ingest, terminal callback, and dead-letter replay together.
4. Continue with the lower-priority throughput work: bounded HTTP detail concurrency, browser fallback budgets, and production artifact storage policy.

## Current Strengths

### Observable Lifecycle

Current scrape lifecycle has strong observability:

- `job_source_runs` tracks status, lifecycle fields, heartbeats, progress, outcome, and source quality.
- `job_source_run_events` records API-side enqueue, dispatch, callback, retry, cache-reuse, and stale-reconcile events.
- `scrape_execution_events` records worker-side ingress, fetch, normalization, callback, and terminal failure stages.
- run diagnostics expose story/usefulness semantics instead of relying only on `COMPLETED`.
- support endpoints and bundles exist for scrape incidents.

This aligns with `docs/04_architecture_and_data/01_decisions.md`: reliability means predictable, observable, and graceful, not perfect source success.

### Catalog-First Efficiency

The API correctly tries to avoid unnecessary scraping:

- catalog rematch is attempted before worker dispatch
- recent DB reuse can satisfy requests when fresh-candidate gates are met
- enqueue responses include explicit `reuseDiagnostics`
- worker detail fetch skips fresh URLs already present in the catalog

This matches the roadmap rule that scraping is acquisition infrastructure, not the product moat.

### Source-Specific Safety

The Pracuj path includes several important protections:

- source URL allowlist before enqueue
- recommended-offer section exclusion
- zero-result detection and filter relaxation
- adaptive broad-acquisition planning
- HTTP-first fetch with browser fallback
- detail-fetch budget calculation
- blocked/degraded/empty/partial outcome classification
- parser drift fixture coverage

### Partial Result Preservation

Accepted offers can be sent incrementally to the API during a running scrape. This is a major stability improvement because a late terminal callback failure no longer has to imply total data loss.

## Findings And Improvements

## 1. Worker Queue Is Still Process-Local

Severity: High

Evidence:

- `apps/worker/src/queue/task-runner.ts` stores queued tasks in an in-memory array.
- `docs/01_project_context/02_project_state.md` already lists the in-memory worker queue as a remaining risk.
- `docs/05_operations_and_deployment/01_runbook.md` requires `QUEUE_PROVIDER=cloud-tasks` in production, but local/direct execution still depends on the same in-process runner once a request reaches the worker.

Impact:

- queued work is lost if the worker process restarts
- active task state is lost on Cloud Run instance termination
- queue depth and active counts are per instance, not global
- local testing can underrepresent production retry behavior
- process-local queue stats cannot provide strong operational truth

Proposed solution:

1. Keep Cloud Tasks as the production ingress source of truth.
2. Add explicit task lease/run execution state in the API DB or a dedicated worker task table.
3. Make worker execution idempotent by task id, source run id, and dedupe key.
4. Persist task start, lease renewal, timeout, and terminal result events.
5. Treat the in-memory queue as development-only and label it that way in docs and health output.
6. Add a smoke assertion that production-mode env rejects `QUEUE_PROVIDER=local`.

Suggested implementation slice:

1. Add `worker_task_executions` table or extend existing scrape execution events with a deterministic task id.
2. Record `accepted`, `started`, `heartbeat`, `completed`, `failed`, and `timed_out`.
3. Refuse duplicate active execution for the same `sourceRunId` unless the existing lease is expired.

## 2. Task Dispatch Deadlines Are Not Explicitly Aligned

Severity: High

Evidence:

- API Cloud Tasks enqueue uses `createTask` but does not set an explicit dispatch deadline in `apps/api/src/features/job-sources/job-sources.service.ts`.
- worker task timeout defaults to `WORKER_TASK_TIMEOUT_MS=180000`.
- worker callback retries can add time after scrape fetch/parse work.
- API stale-run thresholds are configured separately through `SCRAPE_STALE_PENDING_MINUTES` and `SCRAPE_STALE_RUNNING_MINUTES`.

Impact:

- Cloud Tasks may retry while the worker is still finalizing if the HTTP request exceeds platform/task deadline.
- API can mark a run `RUNNING` after dispatch even if the worker later fails before a heartbeat.
- late callbacks can race stale reconciliation.
- operators must reason across multiple independent timeout knobs.

Proposed solution:

1. Define one scrape budget model:
   - task dispatch deadline
   - worker fetch/detail budget
   - finalization budget
   - callback retry budget
   - API stale pending/running thresholds
2. Set Cloud Tasks dispatch deadline explicitly from this model.
3. Ensure API stale-running timeout is longer than worker timeout plus callback retry maximum.
4. Emit the resolved budget values into `worker_task_dispatched` and `scrape_start` events.
5. Add config validation that rejects unsafe combinations in production.

Suggested target:

- `worker_task_timeout_ms < cloud_tasks_dispatch_deadline_ms < scrape_stale_running_ms`
- `callback_retry_total_budget_ms` must be included in the worker task timeout or explicitly excluded by design.

## 3. Timeout Cancellation Is Strong During Fetch But Weaker During Finalization

Severity: High

Evidence:

- `apps/worker/src/jobs/scrape-job.ts` creates an `AbortController` and passes it into crawl/fetch operations.
- `apps/worker/src/sources/pracuj-pl/crawl.ts` uses abort-aware fetch, navigation, waits, and sleeps.
- `apps/worker/src/queue/task-runner.ts` wraps the entire task in `Promise.race`, but this wrapper does not cancel `handleTask`.
- the scrape timeout in `runScrapeJob` is cleared after collection, before output save and terminal callback dispatch.

Impact:

- fetch/detail work is mostly abortable, but output persistence and callback dispatch can continue beyond the intended task deadline.
- the task runner can consider a task timed out while the underlying scrape is still finalizing.
- if concurrency is increased, a timed-out finalization can overlap with later tasks and consume API/callback/browser resources.

Proposed solution:

1. Use one deadline controller for the entire scrape job, including output save, incremental ingest, and terminal callback.
2. Pass an abort signal into callback dispatch and offer ingest fetches.
3. Reserve a finalization budget before starting detail fetch.
4. When the deadline is reached, stop additional callback retries and emit one deterministic timeout failure callback/dead letter.
5. Change `TaskRunner` to support cooperative cancellation instead of only `Promise.race`.

## 4. Incremental Offer Ingestion Has No Retry Or Dead Letter Path

Severity: High

Evidence:

- `emitAcceptedOffers` sends each accepted job individually.
- `notifyOfferIngest` performs a single API request.
- failures are logged as `OFFER_INGEST_REJECTED`, but the offer is not retried or dead-lettered.
- terminal callback still sends all accepted jobs, which helps, but terminal callback failure is exactly the scenario incremental ingestion is meant to protect against.

Impact:

- transient API/network failures during incremental ingest can silently reduce partial-result durability.
- per-offer serial requests can increase run duration and API request volume.
- terminal callback remains too important as the final fallback.

Proposed solution:

1. Add retry with bounded exponential backoff and jitter for incremental ingest.
2. Add an incremental-ingest dead-letter file/table with replay tooling.
3. Prefer batched incremental ingest:
   - `POST /job-sources/runs/:id/offers/batch`
   - stable per-offer idempotency key: `sourceRunId + offerIdentityKey + contentHash`
4. Track these metrics:
   - `incrementalIngestAttempted`
   - `incrementalIngestAccepted`
   - `incrementalIngestRejected`
   - `incrementalIngestDeadLettered`
5. Keep terminal callback as summary/finalization, not the only reliable bulk persistence path.

## 5. Callback Attempt Metadata Is Ambiguous

Severity: Medium

Evidence:

- worker terminal callback payload uses `attemptNo` based on scrape/listing attempt count.
- `notifyCallback` has its own retry loop, but it sends the same payload on each retry.
- API callback event registration stores `attemptNo` from the payload.
- worker execution events separately record callback retry scheduling.

Impact:

- callback delivery attempts and scrape relaxation/fetch attempts are mixed in one field.
- callback replay/audit rows can understate actual delivery attempts.
- future operators may misread callback retry behavior during incidents.

Proposed solution:

1. Split fields:
   - `scrapeAttemptNo`
   - `callbackAttemptNo`
   - `pipelineAttemptNo` if relaxation attempts need a separate term
2. Compute payload hash over the stable business payload, excluding delivery-attempt-only fields.
3. Store callback delivery attempts as first-class rows even when the final accepted payload is idempotent.
4. Update tests around stale attempts, duplicate event ids, and conflicting payload hashes.

## 6. Browser Fallback Is Useful But Expensive And Abrupt

Severity: Medium

Evidence:

- Pracuj uses HTTP-first fetch and browser fallback for blocked or unusable pages.
- detail browser timeout threshold is very strict: one browser navigation timeout can stop detail crawling as `source_degraded`.
- detail fetches are sequential.
- browser launch/reuse is per crawl run, not shared across runs.

Impact:

- a single transient browser timeout can reduce detail coverage sharply.
- sequential detail fetch protects the source but can underuse available worker budget when HTTP fetches are healthy.
- browser fallback can dominate runtime and Cloud Run CPU/memory cost.

Proposed solution:

1. Keep default behavior conservative for source safety.
2. Add bounded HTTP detail concurrency for HTTP-only successful paths.
3. Keep browser fallback serial or very low concurrency.
4. Replace fixed browser failure thresholds with a budget-aware rule:
   - max browser fallback count
   - max browser fallback time
   - max blocked ratio
5. Emit `browserFallbackBudgetUsedMs` and `browserFallbackBudgetRemainingMs`.
6. Use source-health backoff to reduce scheduled scrape frequency when browser fallback is frequently required.

## 7. Source Adapter Boundary Is Not Fully Generic Yet

Severity: Medium

Evidence:

- docs say future sources should reuse adapter stages.
- `resolvePipeline` distinguishes Pracuj source variants.
- `runFetchStage`, `runParseStage`, and `runNormalizeStage` still call `pipelines['pracuj-pl']` directly.

Impact:

- source variants work because all active sources are Pracuj-like.
- adding a non-Pracuj source could accidentally reuse Pracuj fetch/parse/normalize behavior.
- this increases the risk of source-specific hacks during source expansion.

Proposed solution:

1. Change stage functions to accept the resolved pipeline.
2. Add a worker test with a fake adapter proving fetch/parse/normalize are adapter-specific.
3. Define source capability flags:
   - `supportsHttpListing`
   - `supportsBrowserFallback`
   - `supportsListingSummaries`
   - `supportsDetailCache`
4. Do this before implementing a second production source.

## 8. Catalog Reuse Is Efficient But URL Identity Can Be Tightened

Severity: Medium

Evidence:

- API intent fingerprinting uses source, listing URL, and normalized filters.
- worker and crawler normalize offer URLs by removing search/hash.
- user-provided listing URLs may still differ by equivalent query ordering or tracking parameters.

Impact:

- equivalent scrape intents can bypass short-window idempotency.
- DB reuse can miss equivalent prior runs.
- unnecessary worker dispatches can happen for logically identical listing URLs.

Proposed solution:

1. Canonicalize listing URLs before fingerprinting:
   - lowercase host
   - remove hash
   - sort query params
   - drop known tracking params
2. Store both raw and canonical listing URL on `job_source_runs`.
3. Use canonical URL for intent fingerprint and DB reuse.
4. Keep raw URL for support/debug evidence.

## 9. Auto-Scoring Can Become A Post-Ingest Throughput Bottleneck

Severity: Medium

Evidence:

- `AUTO_SCORE_ON_INGEST` can score ingested offers after linking.
- scoring concurrency is env-driven.
- scoring happens in the API scrape completion path.

Impact:

- scrape completion latency can increase when many offers are inserted.
- scoring failures can add noisy warnings around a successful scrape.
- concurrent user runs can amplify CPU/DB pressure.

Proposed solution:

1. Move auto-scoring to a separate durable background task.
2. Persist scoring queue items per `user_job_offer`.
3. Cap per-run scoring volume by ranking priority.
4. Keep scrape completion focused on persistence/linking/finalization.
5. Report scoring as downstream enrichment, not scrape health.

## 10. Artifact Output Needs Production Storage Policy

Severity: Medium

Evidence:

- worker output defaults to `WORKER_OUTPUT_MODE=full`.
- retention defaults to `WORKER_OUTPUT_RETENTION_HOURS=72`.
- local output paths are included in diagnostics.

Impact:

- Cloud Run filesystem is ephemeral.
- full artifacts can increase disk I/O and memory pressure.
- artifact paths may be unavailable after instance replacement.
- support diagnostics may point at files that no longer exist.

Proposed solution:

1. Use `WORKER_OUTPUT_MODE=minimal` by default in production unless a debug window is enabled.
2. Add an object-storage artifact backend for selected incident artifacts.
3. Store artifact manifest rows with size, storage backend, retention deadline, and redaction status.
4. Keep raw HTML samples bounded and avoid persisting unnecessary source pages.

## 11. Diagnostics Are Strong But Alerting Is Still Mostly Manual

Severity: Medium

Evidence:

- source health, diagnostics summary, callback events, execution events, and support bundles exist.
- runbook still describes manual inspection flows.
- project state lists alerting and long-horizon observability as remaining gaps.

Impact:

- failures are explainable after inspection, but not necessarily detected early.
- scheduled scrape degradation can affect users before an operator notices.
- dead-letter or stale-run accumulation can remain invisible without dashboard checks.

Proposed solution:

Add alert rules on existing signals:

1. `worker_timeout` runs above threshold.
2. callback dead letters greater than zero in the last hour.
3. `runningWithoutHeartbeat` greater than zero.
4. source-health `blockedOutcomeRuns` or `degradedRuns` spike.
5. scheduled enqueue failures in the last 24 hours.
6. silent failures greater than zero.
7. fresh-candidate reuse rejection rate above expected baseline.

## 12. Main Job-Sources Service Is Still Too Large For Safe Change Velocity

Severity: Medium

Evidence:

- `apps/api/src/features/job-sources/job-sources.service.ts` owns enqueue, reuse, scheduling, callback completion, persistence, diagnostics shaping, stale reconciliation, source health, and scoring coordination.
- extracted services exist, but active controller methods still route through the main service.
- some extracted service code contains placeholder coordination comments, so it is not yet a clean ownership split.

Impact:

- future reliability changes are harder to review.
- code duplication can appear between the main service and extracted services.
- tests must cover a very broad class for small changes.

Proposed solution:

1. Finish or remove partial extractions.
2. Split by stable use-case ownership:
   - enqueue/reuse/preflight
   - lifecycle/callback/heartbeat/ingest
   - schedule execution
   - diagnostics/source health
   - persistence/linking helpers
3. Move pure mapping and scoring derivation into feature-local helper modules.
4. Keep public controller contracts unchanged during the refactor.

## Priority Plan

### P0: Stabilize Execution Budgets

Do first:

1. define and validate scrape deadline relationships
2. set Cloud Tasks dispatch deadline explicitly
3. propagate one abort/deadline signal through finalization and callbacks
4. add tests for timeout during callback/finalization

Expected result:

- fewer stale `RUNNING` runs
- fewer duplicate Cloud Task deliveries
- clearer timeout taxonomy

### P1: Make Partial Persistence Reliable

Do next:

1. add retry/dead-letter to incremental ingest
2. add batch incremental ingest
3. make terminal callback summary-only where possible
4. add smoke coverage for incremental ingest retry/replay

Expected result:

- terminal callback failure no longer threatens accepted-offer durability
- API request volume per scrape decreases

### P2: Prepare For Source Expansion Safely

Do before source 2:

1. complete adapter-specific fetch/parse/normalize stages
2. add fake-adapter tests
3. define source capability metadata
4. require fixture-backed parser tests for every source

Expected result:

- new sources reuse orchestration and diagnostics without Pracuj coupling

### P3: Improve Throughput Without Weakening Source Safety

Do after deadline work:

1. bounded HTTP detail concurrency
2. serial/low-concurrency browser fallback
3. browser fallback time/count budgets
4. richer fallback productivity metrics

Expected result:

- better detail coverage within the same worker timeout
- lower browser cost during healthy HTTP runs

### P4: Turn Diagnostics Into Alerts

Do after metrics naming stabilizes:

1. alert on stale runs, callback dead letters, silent failures, source degradation, and schedule enqueue failures
2. include links to support bundle commands in alert runbooks
3. add weekly source-health trend review

Expected result:

- support moves from reactive diagnosis to proactive detection

## Process Improvements

### Pre-Change Checklist For Scraper Work

Before changing scraper behavior:

1. Check whether the issue is acquisition underreach, parser drift, source blocking, matching strictness, or catalog reuse gating.
2. Inspect `queryPlan`, `productivity`, `sourceQuality`, `classifiedOutcome`, `hiddenByModeCount`, and `userInsertedOffers`.
3. Reproduce with `pnpm --filter worker scrape:once`.
4. Add or update a fixture test when parser behavior changes.
5. Avoid weakening strict notebook matching to hide scrape quality issues.

### Release Checklist For Scraper Changes

For any scrape execution change:

1. Run worker tests.
2. Run targeted API job-source tests.
3. Run `pnpm smoke:e2e` when cross-service behavior changes.
4. Confirm docs/runbook updates if env knobs, contracts, or recovery behavior changed.
5. Confirm no debug artifact mode is accidentally enabled for production.

### Operational Review Cadence

Recommended weekly scrape-health review:

1. source-health summary
2. run diagnostics summary with timeline
3. callback event failures/dead letters
4. schedule enqueue failures
5. stale-run reconciliation count
6. average useful-offer ratio and strict-hidden ratio
7. top parser rejection reasons

## Suggested Success Metrics

Track these as scrape reliability/productivity indicators:

- useful runs / total runs
- silent failures / completed runs
- partial success runs / total runs
- stale reconciled runs / total runs
- callback dead letters / callbacks
- incremental ingest accepted / attempted
- average queue wait time
- average fetch/detail/finalize duration
- browser fallback rate
- blocked detail rate
- accepted offers / listing links discovered
- user inserted offers / accepted offers
- strict hidden offers / inserted offers
- fresh-candidate reuse acceptance rate
- schedule enqueue success rate

## Bottom Line

The scrape process is already supportable and well-instrumented. The next engineering value is to make execution semantics as strong as the diagnostics:

1. durable task ownership
2. aligned timeouts
3. reliable incremental persistence
4. unambiguous callback attempts
5. adapter-safe source expansion
6. proactive alerts on existing health signals

This sequence follows the project roadmap: keep scrape reliable enough to trust, improve output usefulness, and avoid broad source expansion until the current source and catalog model are stable.

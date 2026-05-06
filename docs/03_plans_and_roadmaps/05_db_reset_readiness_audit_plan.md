# DB Reset Readiness Audit Plan

Last updated: 2026-05-05

## Purpose

This document defines the work that must be completed before resetting the shared database for a clean restart of test and development data.

The goal is not only to clear old rows. The goal is to make sure that, after reset:

1. newly scraped offers are persisted safely
2. incomplete and failed scrapes do not leave misleading state
3. expiry and stale-offer handling behave predictably
4. matching and notebook flows consume clean, trustworthy offer rows
5. schedule-driven automation continues operating without hidden drift
6. operators can verify success or diagnose failure without guessing

This plan is based on current code paths plus live database inspection on 2026-05-05.

## Reset Decision

Resetting user-facing offer and scrape history for test accounts is reasonable.

Resetting before the remaining readiness gaps are closed is not.

Current implementation is strong enough to scrape, persist, schedule, and render offers, but not yet strong enough to guarantee a clean long-lived post-reset dataset without additional hardening.

## Current Findings

### Confirmed working now

1. Scheduler is currently operational.
   - Live `scrape_schedule_events` show `schedule_trigger_received`, `schedule_enqueue_started`, and `schedule_enqueue_succeeded` on 2026-05-05 for both enabled schedules.
   - Corresponding scheduled runs completed successfully.
2. Scheduled runs can complete successfully end to end.
   - Recent completed scheduled runs include successful output for both active users.
3. Worker persistence already stores expiry-related fields when the source provides them.
   - `expiresAt` and `isExpired` are written into `job_offers`.
4. Main API list paths already filter `is_expired = false` by default.
5. UI already exposes expired/valid-until state when the data exists.

### Confirmed gaps now

1. Expiry coverage is incomplete.
   - Live data: `342` offers total, only `70` with `expires_at`, `0` with `is_expired = true`.
   - Live data: `272` offers are active and have no expiry date.
2. Expiry aging is not actively reconciled after scrape-time.
   - Current code computes `isExpired` during normalization/scrape ingestion.
   - There is no confirmed background reconciliation that marks old rows expired later when `expires_at < now`.
3. Schedule state visibility is misleading.
   - `scrape_schedules.last_run_status` is updated to `ENQUEUED` or `ENQUEUE_FAILED` during trigger time.
   - It is not later reconciled to a terminal outcome like `COMPLETED` or `FAILED`.
   - This can make a healthy scheduler look stuck.
4. Historical data quality is not good enough to preserve as a trustworthy baseline.
   - Live data: `342` Pracuj offers without `job_category_id`.
   - Test users currently have large old linked-offer inventories that do not reflect the intended clean-state behavior after recent scraper and workflow changes.
5. Failure and partial-result semantics still need explicit reset-time validation.
   - Failed runs, stale reconciles, incremental ingest, and partial/no-expiry offers need a clean acceptance checklist before data wipe.

## Readiness Standard

Database reset is allowed only when all blocking items below are complete and the verification gates in this document pass.

The system is reset-ready only if all of the following are true:

1. scheduled and manual scrape flows create coherent run, event, offer, and user-link state
2. failed or partial runs do not leave confusing active artifacts
3. expired offers are hidden or demoted deterministically even when their expiry date passes after initial scrape
4. offers without source expiry signals are still handled safely by notebook and matching flows
5. operators can prove what happened through DB state and support surfaces after any scrape outcome

## Blocking Work Before Reset

### 1. Add deterministic expiry reconciliation after scrape-time

Status: blocking

Problem:

- `isExpired` is currently determined mainly at scrape normalization time.
- If an offer has `expires_at` in the future at scrape time, there is no confirmed later reconciliation step that flips it to expired after the date passes.
- After reset, the dataset will drift back into stale-but-still-active rows unless this is fixed.

Required changes:

1. Add a deterministic expiry reconciliation path for `job_offers`.
2. Decide the canonical rule:
   - preferred: set `is_expired = true` whenever `expires_at < now`
   - preserve source-provided explicit expiry when available
3. Run reconciliation on a safe cadence:
   - scheduled internal job, or
   - bounded reconciliation on critical read/write paths if scheduler-based reconciliation is not ready
4. Ensure reconciliation is idempotent and does not flip expired offers back to active unless a later fresh scrape explicitly proves they are active again.

Acceptance criteria:

1. Offers with past `expires_at` become expired without needing a re-scrape.
2. Notebook/discovery/company views stop showing those offers by default.
3. Matching and user-offer read models treat reconciled expired offers as inactive.
4. Ops metrics expose expired-offer counts that reflect reality, not only scrape-time state.

### 2. Define fallback behavior for offers without source expiry dates

Status: blocking

Problem:

- Most live offers still lack `expires_at`.
- Reset alone does not solve this because some sources or pages will continue to omit expiry signals.

Required changes:

1. Make the product contract explicit for `expires_at = null`.
2. Decide operational behavior:
   - allowed to remain active until rescrape proves expiry
   - or apply a conservative stale-age heuristic for hidden/demoted treatment
3. Expose this clearly in diagnostics and source-health coverage metrics.
4. Confirm notebook and discovery language does not imply false freshness for null-expiry offers.

Acceptance criteria:

1. There is a documented and implemented rule for null-expiry offers.
2. Operators can quantify expiry coverage by source.
3. Post-reset offer aging does not depend on silent assumptions.

### 3. Reconcile schedule status with terminal run outcome

Status: blocking

Problem:

- Scheduler itself is working, but `scrape_schedules.last_run_status` can remain `ENQUEUED` even after the linked run completes.
- This creates false operational ambiguity during and after reset.

Required changes:

1. Update schedule state after run terminalization.
2. Record at least:
   - last terminal run id
   - last terminal outcome
   - last completed/failed timestamp
3. Keep enqueue-time state and terminal state distinct if needed.

Acceptance criteria:

1. A successful scheduled scrape no longer leaves the schedule row looking unfinished.
2. A failed scheduled scrape leaves an explicit terminal reason visible in support/ops views.
3. Support investigation no longer requires correlating raw run rows just to answer "did the last scheduled run really work?"

### 4. Verify clean handling for failed, stale, and partial scrape outcomes

Status: blocking

Problem:

- Reset should not be followed by reintroducing dirty state from failed or incomplete runs.
- Edge cases already seen in history include:
  - enqueue failures
  - worker timeout
  - stale running runs reconciled later
  - callback accepted with partial or degraded result
  - completed runs with zero inserted useful offers

Required changes:

1. Audit terminal run classification rules for:
   - enqueue failure
   - worker timeout
   - callback missing
   - partial detail coverage
   - empty but valid result
   - blocked/degraded source result
2. Confirm user-visible linking rules for partial/incremental ingest:
   - no duplicate links
   - no orphaned links
   - no hidden successful inserts beneath a failed summary without clear diagnostics
3. Confirm stale-run reconcile logic preserves recovered offers and still leaves coherent final run state.
4. Add or tighten tests for these edge classes where coverage is weak.

Acceptance criteria:

1. Failed runs do not silently pollute user-visible active inventory.
2. Partial success is distinguishable from total failure in both DB and support views.
3. Reconciled stale runs cannot leave notebook state inconsistent with run outcome.

### 5. Close category and normalization gaps that would poison the new baseline

Status: blocking

Problem:

- Live inspection shows all current Pracuj offers missing `job_category_id`.
- Resetting into a new dataset while known normalization holes remain defeats the purpose of the reset for matching quality.

Required changes:

1. Audit why category assignment is still absent in current persisted offers.
2. Fix the normalization/persistence path or post-processing path.
3. Validate that new offers after the fix carry expected category and other matching-critical dimensions.

Acceptance criteria:

1. Newly scraped offers populate matching-critical normalized fields at acceptable coverage.
2. Matching after reset is based on intended current data shape, not legacy sparse rows.

## High-Priority Non-Blocking Work

These are not absolute blockers for reset, but should ideally be completed in the same tranche.

### 1. Create a targeted test-data cleanup strategy instead of full-schema destruction

Preferred direction:

1. delete or archive test-user rows in workflow-owned order
2. preserve operational and structural tables unless there is a specific reason not to
3. avoid resetting support/ops evidence that is still useful for deployment debugging

Recommended cleanup scope for test reset:

1. `user_job_offers`
2. test-user-owned `job_source_runs` and related run/callback/event rows where appropriate
3. test-user schedules if they need reseeding
4. test-user profile/input data only if the restart goal includes onboarding from zero
5. shared `job_offers` only if canonical-offer history itself is considered contaminated for this environment

This decision should be explicit before execution:

1. user-only reset
2. user + shared offer reset
3. full environment rebuild

### 2. Add a reset verification script or checklist

After reset, operators should not manually inspect random tables.

Required verification bundle:

1. migration state healthy
2. required tables present
3. seed/admin user state healthy
4. schedule creation works
5. manual scrape works
6. scheduled scrape works
7. expired-offer reconciliation works
8. notebook and matching consume the new rows correctly

### 3. Refresh support tooling for post-reset investigation

Current support tooling is useful, but the local cached API admin token is stale.

Recommended changes:

1. confirm a durable admin support-auth refresh process
2. extend support queries for:
   - expiry coverage
   - expired-offer counts by user/source
   - schedule outcome vs terminal run outcome
   - orphaned user links
3. prefer support bundle recipes over ad hoc SQL once new reset-readiness checks exist

## Edge Cases That Must Be Explicitly Tested Before Reset

### Scrape failure and timeout cases

1. enqueue rejected before worker dispatch
2. worker accepted task but never heartbeats
3. worker heartbeats then never callbacks
4. callback arrives after stale-run reconcile
5. callback payload conflicts or repeats

Expected result:

- no duplicate active offers
- terminal run state remains coherent
- support surfaces explain what happened

### Partial scrape usefulness cases

1. some jobs inserted before terminal failure
2. full listing count found but only subset fully detailed
3. degraded result with browser fallback usage
4. completed run with zero useful offers after filtering

Expected result:

- useful offers remain usable
- degraded/partial semantics stay visible
- no false “success” messaging when output is weak or empty

### Expiry cases

1. source provides future `expires_at`
2. source provides past `expires_at`
3. source provides no `expires_at`
4. source marks explicit expired page but no precise date
5. offer becomes past-due after initial scrape without being rescraped

Expected result:

- expiry policy is deterministic across all five cases
- user-visible lists obey the same rule consistently

### Schedule cases

1. scheduler trigger succeeds and run completes
2. scheduler trigger succeeds but run later fails
3. scheduler trigger fails before enqueue
4. schedule paused by source-health automation
5. schedule due while prior run is still active or recently idempotent

Expected result:

- schedule state remains understandable
- no misleading `ENQUEUED` forever status
- no silent skips without traceable event state

### Matching cases

1. freshly scraped offer with complete normalized fields
2. freshly scraped offer with sparse metadata
3. expired offer previously linked to user
4. zero-category or zero-employment-type row

Expected result:

- matching either handles the row safely or degrades explicitly
- reset baseline is not repopulated with known bad rows unnoticed

## Implementation Phases

### Phase A: Data-contract hardening

1. finalize expiry contract
2. implement expiry reconciliation
3. define null-expiry fallback behavior
4. document terminal schedule outcome semantics

Exit gate:

- expiry and schedule lifecycle rules are explicit in code and docs

### Phase B: Persistence and workflow correctness

1. fix category/normalization holes
2. verify failed/partial/stale scrape handling
3. verify user-link integrity
4. verify matching-critical dimensions on new offers

Exit gate:

- new offers have acceptable normalized quality
- terminal failures no longer leave ambiguous user state

### Phase C: Ops and verification surfaces

1. add support queries and/or ops metrics for reset-readiness checks
2. add a reset verification checklist or script
3. refresh runbook guidance for reset execution and post-reset validation

Exit gate:

- operators can prove correctness without bespoke SQL

### Phase D: Dry-run validation before destructive reset

1. run a bounded cleanup in local or staging-like environment
2. execute manual scrape
3. execute scheduled scrape
4. force one failure-path validation
5. validate expiry reconciliation on seeded test rows
6. validate notebook + matching behavior on the rebuilt rows

Exit gate:

- dry run passes all acceptance gates in this document

### Phase E: Production-like test-account reset

1. freeze writes if needed
2. back up relevant tables or export IDs for rollback reference
3. execute scoped cleanup
4. reseed only required baseline data
5. run post-reset acceptance suite

Exit gate:

- environment is declared clean and operational

## Post-Reset Acceptance Gates

Reset is successful only if all checks below pass.

### Data integrity

1. no orphaned `user_job_offers`
2. no failed cleanup that leaves mixed old/new user inventory
3. expected normalized fields populate on newly scraped rows

### Scrape workflow

1. manual scrape completes successfully
2. scheduled scrape completes successfully
3. failed scrape path is still diagnosable and contained

### Expiry workflow

1. future-expiry offer remains active
2. past-expiry offer becomes expired automatically
3. null-expiry offer follows the documented fallback policy

### Product behavior

1. notebook does not show expired offers by default
2. discovery/opportunities do not inflate from stale rows
3. matching results are based on current normalized data shape

### Ops visibility

1. support bundle or support queries can explain the latest manual run
2. support bundle or support queries can explain the latest scheduled run
3. schedule rows no longer imply stale `ENQUEUED` ambiguity after terminalization

## Recommended Deliverables Before Reset

1. expiry reconciliation implementation
2. null-expiry policy implementation and documentation
3. schedule terminal-status reconciliation
4. normalization/category gap fix
5. targeted tests for failure/partial/expiry edge cases
6. support query additions for expiry and schedule-terminal visibility
7. reset verification checklist or script
8. runbook update for scoped reset execution

## Recommended Sequence

1. implement expiry reconciliation and null-expiry policy first
2. fix schedule terminal-state visibility second
3. fix category/normalization gaps third
4. tighten edge-case tests and support tooling fourth
5. run a dry-run cleanup and acceptance suite fifth
6. reset test-account data only after all prior gates pass

## Explicit Do-Not-Do List

1. do not drop the full schema just to clear test users
2. do not reset before expiry aging is solved
3. do not treat current scheduler success as sufficient proof of total automation readiness
4. do not preserve old test-user offer inventories if the goal is a trustworthy clean baseline
5. do not call reset complete without validating one failed scrape path and one scheduled scrape path

## Definition of Done For Reset Readiness

This audit is complete only when:

1. all blocking items are implemented
2. dry-run validation passes
3. reset execution scope is explicitly chosen
4. post-reset acceptance gates are green
5. runbook and project-state docs reflect the new reset-ready baseline

# Sprint Plan

Last updated: 2026-03-21

This document translates the current roadmap into implementation-oriented sprint slices. It is intentionally more detailed than `docs/03_plans_and_roadmaps/01_roadmap.md` and should be updated whenever priorities or dependencies shift materially.

## Current Delivery Position

- Core platform foundations are in place.
- The product is already usable for:
  - onboarding
  - career-profile creation
  - scrape triggering
  - notebook triage
  - basic support and ops diagnostics
- The highest-value work now is not another isolated feature spike. It is workflow completion plus reliability hardening:
  - fewer dead ends for users
  - faster action loops in notebook
  - stronger source reliability
  - safer startup, smoke, and deploy behavior

## Product Strategy Constraint

- The app must win on workflow quality, not on raw source count.
- Scraping is a required acquisition layer, but it is not the product moat.
- New source adapters should land only when workflow value, parser stability, and supportability are strong enough to justify them.

## Planning Principles

- Each sprint should deliver a full slice across API, web, worker, and docs where needed.
- Server-driven workflow logic stays in API/read models, not duplicated in frontend.
- Reliability work is first-class product work, not “later cleanup”.
- Avoid widening the feature surface faster than supportability and smoke coverage can keep up.
- Prefer features that reduce user decision time over features that only increase listing volume.

## Sprint 1: Workflow Completion and Recovery Closure

### Goal

Make setup, recovery, and first successful product usage feel deterministic for a normal user.

### Primary Scope

- Expand recovery-center usage across dashboard, notebook, and profile/document flows.
- Add better route-level blocked-state handling so every blocked surface points to the exact next step.
- Improve document recovery UX:
  - single retry status feedback
  - retry-all visibility
  - clearer extraction error messaging
- Improve scrape preflight UX:
  - explain blockers in user language
  - distinguish warning vs hard stop
  - make schedule/manual-trigger context visible from the main workflow

### Likely Files/Areas

- `apps/api/src/features/workspace/**`
- `apps/api/src/features/documents/**`
- `apps/api/src/features/job-sources/**`
- `apps/web/src/features/workspace/**`
- `apps/web/src/features/documents/**`
- `apps/web/src/features/job-sources/**`
- `apps/web/src/app/(private)/**`

### Exit Criteria

- No important workflow surface fails with a generic dead-end empty state.
- Users can recover from failed document extraction without leaving the product flow.
- Manual scrape actions consistently surface preflight guidance before enqueue.
- Smoke assertions cover the end-to-end recovery path.

## Sprint 2: Notebook Throughput and Application Pipeline

### Goal

Reduce time from “offers exist” to “user made progress on real applications”.

### Primary Scope

- Implemented in current branch:
  - follow-up reminder metadata in notebook pipeline details
  - persisted follow-up-aware notebook filters
  - notebook summary follow-up counts
  - dashboard focus queue for due follow-ups, strict top matches, and unscored leads
- Add stronger notebook quick-action flows:
  - unscored first
  - strict top matches
  - stale follow-up needed
  - saved/applied funnel slices
- Add pipeline-oriented UX improvements:
  - follow-up date or reminder metadata
  - clearer stage transitions
  - better bulk action ergonomics
- Improve details view with more actionable prep/follow-up context.
- Consider a lightweight “today’s focus” or “needs attention” queue read model.

### Likely Files/Areas

- `apps/api/src/features/job-offers/**`
- `apps/web/src/features/job-offers/**`
- `apps/web/src/shared/store/**`

### Exit Criteria

- Users can enter notebook and immediately act on a meaningful subset without manually building filters.
- Notebook summary and quick actions stay aligned with ranking behavior.
- Basic application follow-up state is persisted, searchable, and reflected in summary surfaces.

### Remaining Follow-On Work

- Add bulk next-step editing beyond follow-up updates.
- Continue refining dashboard-to-notebook focus deep-link ergonomics.
- Expand long-tail notebook mobile polish after the current follow-up emphasis changes.

## Sprint 2.5: Product Differentiation Over Native Job Boards

### Goal

Make the notebook clearly more useful than using the source platforms directly.

### Primary Scope

- strengthen cross-source deduplication and canonical offer identity
- explain why an offer is worth attention now
- improve follow-up and prep guidance in notebook detail views
- surface hidden/degraded result states clearly so users trust what they are seeing

### Exit Criteria

- users can understand why an offer is shown, hidden, or degraded
- notebook gives a clearer next action than the source board itself
- degraded scrape outcomes still lead to useful triage when possible

## Sprint 3: Scraper Quality and Source Reliability

### Goal

Improve confidence that scrape runs either produce useful results or fail with clear, supportable explanations.

### Primary Scope

- Harden source-specific normalization:
  - employment type aliases
  - work mode aliases
  - seniority normalization
- Improve parser/degradation taxonomy:
  - blocked
  - empty because strict filters
  - degraded source layout
  - partial extraction
- Expand diagnostics and source-health summaries with stable failure codes and counts.
- Improve retry/replay debug value so support can reason about callback and parser failures faster.

### Likely Files/Areas

- `apps/worker/src/jobs/**`
- `apps/worker/src/sources/**`
- `apps/api/src/features/job-sources/**`
- `apps/api/src/features/ops/**`

### Exit Criteria

- Degraded source behavior is distinguishable from user filter emptiness.
- Source-health summaries show actionable quality signals rather than only run counts.
- Worker and API tests cover new normalization/failure-classification edges.

### Status

- Shipped:
  - deterministic source alias normalization for contract/work-mode/seniority
  - richer blocked/degraded/empty/partial classification
  - expanded source-health rollups
  - worker + API regression coverage for these edges
- Remaining:
  - more source-specific parser hardening as additional adapters land

## Sprint 4: Durable Async Execution and Background Workflow Safety

### Goal

Move fragile synchronous or in-memory-heavy flows toward durable execution.

### Primary Scope

- Move document extraction and profile generation toward durable queue execution where missing.
- Evaluate whether scrape orchestration and follow-up tasks need separate queue semantics.
- Reduce reliance on in-memory worker behavior for critical long-running tasks.
- Tighten idempotency and retry semantics for async operations that mutate user-facing state.

### Likely Files/Areas

- `apps/api/src/features/documents/**`
- `apps/api/src/features/career-profiles/**`
- `apps/api/src/features/job-sources/**`
- `apps/worker/**`
- deployment/runtime env docs

### Exit Criteria

- Critical background flows survive restarts better than the current in-memory model.
- Async failure and retry states are visible in product/support surfaces.
- Queue auth and callback contracts remain explicit and test-covered.

## Sprint 5: Observability, Smoke, and Release Hardening

### Goal

Make local setup, CI smoke, and production promotion reliable enough that operational friction stops slowing feature delivery.

### Primary Scope

- Improve startup orchestration:
  - deterministic local stack boot order
  - clearer failure summaries
  - health/readiness consistency
- Extend smoke to better cover the actual product workflow.
- Add or improve rollback-oriented release metadata and post-deploy verification.
- Expand long-horizon ops views and prepare alerting-friendly metrics surfaces.

### Likely Files/Areas

- `scripts/**`
- `docs/05_operations_and_deployment/01_runbook.md`
- `.github/workflows/**`
- `apps/api/src/features/ops/**`
- deploy scripts/docs

### Exit Criteria

- `pnpm smoke:e2e` fails for real product regressions, not routine startup timing issues.
- Post-deploy verification exercises the newest user-critical flows.
- Release promotion and rollback steps are explicit and documented.

### Status

- Shipped:
  - smoke now starts dedicated local services, clears stale fixture scrape runs, and retries rate-limited workflow steps
  - auth/bootstrap and ops-path local smoke failures were hardened away
  - release candidate / deploy / promote workflows now emit release metadata artifacts
  - rollback summary now captures from/to revisions and images
- Remaining:
  - broader alerting-friendly operational metrics and production rollback rehearsal

## Sprint 6: Product Maturity and Multi-Source Expansion Readiness

### Goal

Prepare the system for broader ingestion and smarter assistant behavior without destabilizing the core experience.

### Primary Scope

- Refine matching and notebook prioritization with real-world usage learnings.
- Add higher-signal assistant features:
  - follow-up recommendations
  - application prep prioritization
  - better explanation quality
- Prepare source abstraction boundaries for additional job sources.
- Tighten data model and API contracts before multi-source rollout.
- Define source-selection rules before implementing new adapters:
  - unique supply value
  - maintainable transport strategy
  - support/debug plan
  - fixture-backed parser coverage

### Exit Criteria

- Product can scale beyond the initial source with bounded architectural change.
- New assistant capabilities improve actionability rather than adding noise.
- Support and smoke remain strong enough to absorb wider ingestion scope.

## Future Backlog Themes

- Selective multi-source ingestion adapters
- Durable background-job orchestration everywhere it matters
- Alerting and incident-response hooks
- Stronger design-system consistency across old and new screens
- More complete application CRM behavior in notebook
- Safer admin tooling and rate-limited support actions

## Candidate Feature Backlog To Prefer Over Random Expansion

1. stronger follow-up/reminder workflow
2. cross-source deduplication and canonical offer identity improvements
3. application-prep and next-step assistance
4. degraded/salvaged result handling that still gives users useful leads
5. source-health gating and circuit-breaking for unstable adapters
6. second-source rollout only after the above are stable

## Recommended Sprint Ordering

1. Sprint 1
2. Sprint 2
3. Sprint 3
4. Sprint 5
5. Sprint 4
6. Sprint 6

This order intentionally prioritizes user workflow smoothness and release confidence before deeper platform migrations, unless production pain forces Sprint 4 earlier.

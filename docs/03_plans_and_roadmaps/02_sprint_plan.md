# Sprint Plan

Last updated: 2026-05-03

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

## Completed Frontend Tranche: Workspace UX Flattening And Query Trust

This web-focused execution slice is now implemented and should be treated as the new baseline before any broader frontend expansion or aesthetic redesign.

Primary drivers for the tranche were:

- core workflow routes felt too boxed and too panel-heavy
- planning had sticky/layout trust issues
- opportunities previously used request-heavy free-text filtering and unshareable pagination state
- notebook route freshness was not trustworthy enough after cross-route mutations
- companies and profile had mixed hierarchy quality and rough loading/query behavior

Execution highlights for this tranche:

1. rebuild the shell header into full-width workspace chrome
2. fix planning sticky overlap and flatten planning route composition
3. move opportunities to URL-driven debounced filters with shareable `page` and `perPage` pagination state
4. tighten opportunities detail-rail spacing and reduce nested box treatment
5. harden notebook/discovery freshness after cross-route mutations
6. debounce and URL-sync company-route filters while improving company loading states
7. rebalance profile hierarchy and replace raw profile-health signal labels with user-facing wording
8. restyle undo toasts so action affordances match the lighter workspace language
9. add regression coverage for query hygiene, route freshness, and layout stability

Completed outcome summary:

- core workspace routes now rely more on open sections, tonal grouping, and spacing than stacked bordered cards
- planning no longer has the sticky overlap problem that previously broke trust in the automation surface
- opportunities and companies no longer fetch on every free-text keystroke
- opportunities filter and pagination state now survives reload/back/forward through URL ownership
- notebook refresh behavior after route-to-route mutations is materially more trustworthy
- companies and profile now read more like product routes than generic component grids

Route-by-route baseline after completion:

1. Shell
   - header is now workspace chrome spanning the full content width instead of a rounded content card
   - page identity relies more on section hierarchy below the shell, not stacked top chrome
2. Planning
   - automation route keeps one primary content area plus support guidance instead of layered inset panels
   - sticky utility overlap is removed, so trust language no longer sits on broken layout behavior
3. Opportunities
   - `search` and `tag` debounce before route updates or API requests
   - `mode`, `hasScore`, `page`, `perPage`, and selected offer context are URL-owned
   - explicit page-based review remains, but pagination state is now stable across reload and back/forward navigation
   - list controls and selected-offer rail rely on lighter grouping instead of nested card stacks
4. Notebook
   - route-local UI state is narrower and less coupled to the broad shared UI store
   - post-mutation freshness is stronger for notebook, discovery, and workflow summary read models
   - action-plan, reminder, and selected-workspace sections are flatter and easier to scan
5. Companies
   - `search` and `location` debounce before querying
   - route query preserves browse state
   - loaders and list/detail composition now match the lighter workspace family
6. Profile
   - profile input is the dominant source-of-truth surface again
   - supporting sections are lighter and less wasteful with height
   - profile health labels are now user-facing instead of DB-facing

Guardrails this tranche established for later frontend work:

- do not reintroduce request-per-keystroke server filters
- do not hide route-critical filters and pagination only in local component state
- do not solve every hierarchy problem with another bordered card
- prefer targeted invalidation and route-level mount refetch over globally aggressive query defaults
- keep notebook as the active-work owner and avoid route-to-route stale-state surprises

Preferred commit sizing:

- usually `~200-300` changed lines
- split any `500+` line frontend slice into two smaller commits around state/model vs UI/composition boundaries

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

### Status

- Shipped:
  - server-driven workflow attention signals on notebook offers
  - richer dashboard focus and action-plan slices for due-today, prep-next, and awaiting-decision work
  - workflow-aware prep packet context and requirement highlights
  - explicit API-driven collection-state guidance for hidden/degraded/empty queues
  - visible bulk workflow editing for active pipeline roles
  - email reminder delivery with persisted per-offer delivery state
  - notebook reminder delivery badges plus action-plan driven follow-up shortcuts in the selected-offer workflow
- Remaining:
  - deeper active-offer mobile polish and richer long-tail prep assistance

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

### Reliability-First Tranche

Ordered tranche for the next reliability-heavy delivery slice:

1. `fix: stabilize worker scrape timeout budget`
2. `feat: persist source automation pause state`
3. `feat: add stable scrape stage stop diagnostics`
4. `test: add fixture-backed pracuj parser coverage`
5. `feat: add scrape productivity loss breakdown`
6. `feat: add source health recovery guidance`
7. `feat: make incremental offer ingest restart-safe with DB-backed dispatch recovery`
8. `feat: move document extraction to durable async queue semantics`
9. `feat: move career-profile generation to the same durable async model`
10. `feat: strengthen notebook attention queues using scrape reliability context`
11. `docs: record the reliability-first tranche in sprint plan`

Current branch status for this tranche:

- Shipped in branch:
  - timeout-budget protection now clamps unsafe worker pacing so live `pracuj` runs finish inside the task budget
  - source automation pause windows are persisted with failure mix and an ops override path
  - worker callbacks now emit stable stop reasons plus stage retry counters
  - parser and listing-section drift coverage now uses committed `pracuj` fixtures
  - run diagnostics now expose productivity-loss breakdown from listings to notebook insertion
  - source-health responses now include explicit `wait` / `retry` / `inspect` / `rematch` guidance
  - stale scrape recovery now preserves incrementally persisted offers and returns a stable late-callback idempotency reason
  - document extraction now has DB-visible queue, lease, and attempt metadata for restart-safe pickup
  - career-profile generation now has DB-visible queue, lease, attempt, and generation-state metadata with product/web visibility
  - notebook and discovery details now render scrape reliability context for degraded, partial, and recovered offers
  - email reminder delivery now persists per-offer delivery outcome and is reflected back into notebook read models
- Remaining in tranche:
  - deeper notebook pipeline automation on top of the new reminder and async state

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
  - smoke now verifies career-profile async lifecycle fields, notebook reminder-delivery state, support overview, and support user incident payloads
  - ops metrics/support bundles now expose alerting-friendly reminder-delivery and career-profile-generation failure signals
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

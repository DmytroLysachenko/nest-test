# Notebook Workflow Throughput And Reminder Delivery Audit Plan

Last updated: 2026-04-26

## Status

Planned.

## Goal

Audit the end-user notebook workflow to answer:

1. whether the notebook is materially faster and more trustworthy than managing applications in native job-board tabs
2. where reminder controls, reminder delivery, and follow-up execution still feel incomplete
3. which notebook interactions create drag instead of momentum
4. whether scheduled scrapes are actually honoring user-configured cadence in production-like reality
5. whether the companies surface is functionally correct and product-aligned

This audit is the direct follow-up to the completed information-architecture and workflow-ownership cleanup.

The previous audit fixed:

- page ownership across `Home`, `Planning`, `Opportunities`, `Notebook`, `Progress`, and `Profile`
- repeated readiness/blocker furniture across non-owning routes
- notebook dependence on broad route summary composition where route-specific ownership was cleaner

This audit focuses on:

- notebook throughput
- reminder controls and delivery trust
- active-role execution quality
- scheduled scrape reliability verification
- companies surface correctness and UI quality

## Why This Audit Is Next

The product structure is cleaner now.

The next bottleneck is not route confusion. It is whether the day-to-day active application workflow is actually strong enough to justify using the app instead of falling back to email, spreadsheets, browser tabs, and native job boards.

The roadmap already points here:

- user-facing reminder controls remain unfinished
- richer prep and next-step support is still needed
- deeper pipeline automation is still needed
- schedule reliability matters because notebook throughput collapses if fresh opportunities do not arrive when the user expects them

## Current Surfaces In Scope

Primary surfaces:

- `/notebook`
- `/opportunities`
- `/planning`
- `/activity`
- `/companies`
- company detail page route(s)

Primary backend and platform areas:

- `apps/api/src/features/job-offers`
- `apps/api/src/features/job-sources`
- `apps/api/src/features/workspace`
- `apps/web/src/features/job-offers`
- `apps/web/src/features/job-sources`
- `apps/web/src/features/companies` if present
- schedule/event persistence in `packages/db`
- production scheduler wiring and GCP execution history

## Core Product Principle

The notebook should behave like an application command surface, not just a storage view.

It should help the user:

1. know what deserves attention today
2. complete follow-up work quickly
3. trust that reminders and automatic updates are happening when promised
4. recover stalled roles without friction
5. move from opportunity review into active pipeline work with minimal repeated effort

## Executive Summary

The product now has a clearer route structure, but the highest-value workflow still has unfinished trust and throughput gaps.

The main concerns are:

1. reminder state is visible, but user-facing reminder control may still be weaker than the actual workflow needs
2. notebook execution is stronger than before, but still may not compress enough daily effort for follow-ups, status movement, prep, and stale-role recovery
3. scheduled scrapes appear not to be firing on the cadence the user selected, which is a product-trust problem and not just an ops detail
4. the companies surface appears partially populated at list level but broken at detail level, which weakens confidence in the company-memory direction
5. company detail UI needs alignment and empty-state cleanup even before richer company functionality is added

## Audit Tracks

## Track 1: Notebook Throughput

Focus:

- active pipeline ergonomics
- follow-up execution speed
- stale-role recovery
- bulk action usefulness
- prep and next-step support

Questions:

1. can a user clear the highest-priority notebook work in a few obvious actions
2. are due, overdue, and stalled roles surfaced in the right order
3. does the selected-offer workspace reduce context switching enough
4. which notebook actions still require too many clicks or too much interpretation
5. where should automation or defaults replace manual repeated editing

Likely hotspots:

- pipeline board
- action-plan card
- selected-offer workspace
- bulk workflow editor
- follow-up filters and queue shortcuts
- prep generation and prep reuse

## Track 2: Reminder Controls And Delivery Trust

Focus:

- reminder creation and editing
- reminder visibility
- reminder delivery outcomes
- delivery failure recovery
- user understanding of what is in-app versus external delivery

Questions:

1. can users intentionally manage reminders without confusion
2. do reminder states like `pending`, `delivered`, and `failed` lead to the right next action
3. does the product expose enough control over reminder timing, snooze behavior, and recovery
4. do users know when the app itself is tracking a follow-up versus when an external reminder was actually delivered
5. what should happen when reminder delivery fails repeatedly

Likely hotspots:

- reminder preview
- follow-up actions in notebook list/detail
- reminder delivery badges
- stale-pipeline and due-today quick actions
- recovery paths for failed delivery

## Track 3: Scheduled Scrape Reliability And Root-Cause Verification

Focus:

- whether scheduled scrapes actually run on the user-configured cadence
- whether schedule state in UI matches persisted DB state and real trigger history
- whether GCP-triggered execution is reaching the API and enqueue path as intended

Problem statement to verify:

- users can set a schedule, but scheduled scrapes do not appear to run at the specified cadence in real usage

Required investigation method for this audit:

1. inspect persisted schedule rows and related execution/event history in Neon DB
2. inspect GCP scheduler/task history and trigger evidence
3. inspect API code paths that compute due schedules, `next_run_at`, pause conditions, and enqueue behavior
4. inspect worker/API event history correlation where relevant
5. confirm the root cause with concrete evidence before any fix is proposed

Important constraint:

- this is not just a UI copy issue
- the audit must produce a root-cause statement, not only a symptom description

Examples of possible failure classes to test during the audit:

- incorrect `next_run_at` computation
- due schedules not being picked up
- Cloud Scheduler/GCP trigger drift or auth failure
- pause/degradation logic suppressing runs unexpectedly
- enqueue path succeeding partially but not creating expected visible downstream results
- UI showing stale schedule state

Expected audit output for this track:

- confirmed root cause or narrowed root-cause set
- evidence path from DB + GCP + code
- fix plan in logical commits

## Track 4: Companies Surface Correctness

Problem statement to verify:

- the companies list shows populated company count, but opening company detail pages leads to `Company not found`

Focus:

- list-to-detail routing correctness
- identifier mismatch between list items and detail fetch
- missing backend read model or broken param mapping
- empty-state handling quality

Questions:

1. why does the list render companies while details resolve to empty state
2. is the issue in route params, API lookup, data normalization, or missing catalog linkage
3. is the companies surface ready to stay user-facing in its current state
4. what is the smallest correct product behavior if richer company intelligence is not ready yet

Required outcome:

- confirm whether company detail should be fixed, reduced, or temporarily constrained until data support is real

## Track 5: Company Detail UI Alignment

Focus:

- empty-state alignment
- layout consistency
- route polish
- product-language fit

Current concern:

- the company detail empty state is visually misaligned and weakens trust immediately

Questions:

1. does the company page use the same surface hierarchy as the rest of the product
2. is the empty state centered, spaced, and action-oriented correctly
3. should the page offer fallback navigation back to opportunities or companies list
4. does the company route need a leaner placeholder product state until richer company data exists

## Main Findings To Confirm

## 1. Notebook is stronger structurally than operationally

Working hypothesis:

- the notebook has the right page ownership now, but throughput gains may still be limited by reminder friction, repeated edits, and weak recovery paths for stale work

## 2. Reminder trust is not complete yet

Working hypothesis:

- the read models expose useful reminder information, but users may not yet have enough direct control or clear recovery flows to trust reminders as part of daily workflow

## 3. Scheduled scrape trust may be materially broken

Working hypothesis:

- schedule UX exists and state is exposed, but real scheduled execution may be unreliable or incorrect relative to user-selected cadence

This is high priority because:

- it breaks freshness expectations
- it undermines notebook trust
- it can make the product look inactive even when the setup appears complete

## 4. Companies surface is ahead of its data integrity

Working hypothesis:

- list-level company data exists, but the detail experience is not wired or stable enough to support the current user-facing route

## 5. Company detail UI is below product baseline

Working hypothesis:

- even if the data issue is fixed, the company page still needs alignment with the product’s current UI standard

## Proposed Outcome Model

## Notebook

Should become:

- the fastest place to complete today’s application work
- the trusted owner of reminders, follow-ups, prep, and active pipeline state

Should not become:

- a bloated reporting page
- a second opportunities review page

## Planning

Should continue to own:

- automation state
- cadence
- trust messaging

Must also truthfully reflect:

- whether scheduled runs are actually occurring

## Companies

Should become one of two things:

1. a real company-memory surface with correct list/detail behavior
2. or a reduced/guarded route until the data contract is ready

## Action Plan

## Phase 1: Reminder And Notebook Throughput Audit

1. map every current notebook follow-up and reminder action
2. identify repeated or slow interactions
3. identify missing direct controls
4. classify stale-role and failed-reminder recovery gaps

## Phase 2: Scheduled Scrape Reliability Investigation

1. inspect schedule persistence and event history in Neon DB
2. inspect GCP scheduler/task history and trigger evidence
3. inspect code paths for due-schedule pickup, pause logic, enqueue, and `next_run_at`
4. confirm root cause with evidence
5. define fix sequence

## Phase 3: Companies Surface Audit

1. trace company list item data to detail route params
2. confirm backend lookup and API contract
3. decide whether detail should be fixed immediately or temporarily constrained
4. fix empty-state UI alignment regardless of broader data decision

## Phase 4: Implementation Sequence

1. improve notebook throughput and reminder controls
2. fix reminder trust and delivery recovery UX
3. fix scheduled scrape reliability based on confirmed root cause
4. fix company detail correctness
5. align company detail UI with current product baseline
6. update docs and roadmap state

## Suggested Commit Sequence

1. `docs: audit notebook throughput reminder delivery and schedule trust gaps`
2. `refactor: tighten notebook follow-up and reminder control flow`
3. `refactor: improve notebook stale-work recovery and bulk execution ergonomics`
4. `fix: clarify reminder delivery states and recovery paths`
5. `fix: confirm and repair scheduled scrape cadence execution`
6. `fix: repair companies detail lookup and route contract`
7. `refactor: align company detail empty state and layout with product UI`
8. `docs: update roadmap and product workflow docs after notebook and companies audit`

## Success Criteria

This audit is successful when:

1. notebook users can clear high-priority follow-up work with less friction
2. reminder controls and reminder outcomes are understandable and trustworthy
3. scheduled scrapes are proven to run on the configured cadence or a root cause is proven and fixed
4. companies list and company detail routes are functionally consistent
5. company detail UI no longer falls below the current product baseline
6. the product feels stronger in daily active use, not just cleaner in structure

## Final Recommendation

The next product wave should not broaden the app first.

It should deepen the workflows users already depend on:

1. active application management
2. reminder trust
3. automatic freshness
4. company memory that actually resolves correctly

That is the highest-value next audit because it directly tests whether the product can win on daily job-search execution instead of only on organization and surface cleanup.

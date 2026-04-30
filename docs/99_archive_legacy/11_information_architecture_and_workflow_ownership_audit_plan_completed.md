# Information Architecture And Workflow Ownership Audit Plan

Last updated: 2026-04-26

Completed and archived.

## Implementation Status

Started.

Implemented in the first pass:

- route ownership targets are now explicitly documented in the workflow docs
- `Home` has been narrowed further toward direction and next-action ownership
- `Planning` now states its automation-only ownership more explicitly in product copy

In progress:

- removing duplicated readiness and blocker summaries from non-owning routes
- strengthening `Notebook` as the sole active-work workspace

Implemented in the current pass:

- `Progress` has been reframed into a clearer momentum/history surface instead of a second orientation page
- `Profile` no longer carries the broad workflow recovery panel and is being kept closer to source-of-truth maintenance only
- notebook controls are now pipeline-scoped on the notebook route, while route loading/gating copy is more specific to discovery vs active-work ownership
- route-level data ownership is being tightened so notebook rendering no longer reaches into the full workspace summary, and planning/progress blocker fallbacks now resolve by their actual route

## Goal

Audit the current end-user product structure to answer:

1. which route owns which user job-to-be-done
2. where workflow responsibility is duplicated
3. which pages should summarize vs execute work
4. which read models should stay API-owned instead of being recomposed in the web layer
5. how to reduce navigation overlap so the product feels simpler and faster to use

This audit is the direct follow-up to the completed product-surface and role-boundary cleanup.

The previous audit fixed:

- internal/debug language leaking into user routes
- operator-style chrome on user pages
- weak product/admin boundaries

This audit focuses on:

- route ownership
- page hierarchy
- duplicated workflow blocks
- product flow clarity

## Current Product Surfaces In Scope

End-user routes currently include:

- `/`
- `/planning`
- `/opportunities`
- `/notebook`
- `/activity`
- `/profile`
- `/companies`
- `/onboarding`

These routes are all defensible individually, but the ownership split between them is still not fully crisp.

## Core Product Principle

Each page should have one primary job.

The product should make it obvious:

1. where to go to understand what changed
2. where to review fresh opportunities
3. where to manage active applications
4. where to change profile/setup inputs
5. where to control automation

When a page tries to do two or three of those jobs at once, the result becomes summary duplication, repeated CTA blocks, and weak page identity.

## Executive Summary

The app is now much cleaner in tone and product boundaries, but the information architecture still has overlap between orientation pages and execution pages.

The main issues are:

1. `Home` and `Progress` both act like orientation layers
2. `Opportunities` and `Notebook` are directionally correct, but some review/refresh/summary patterns still overlap
3. `Profile` mixes durable editing responsibilities with some secondary readiness/orientation furniture
4. `Planning` is much cleaner now, but its ownership should stay narrow and protected from drifting back into general workflow summary
5. route-to-route movement is mostly sensible, but page identity is not yet strong enough to make the product feel inevitable

The next product improvement should not be more surface area.

It should be stricter ownership of the surfaces that already exist.

## Target Ownership Model

## `Home`

Own only:

- what changed
- what needs attention next
- where the user should go now

Should not own:

- detailed progress history
- deep readiness breakdowns repeated from other pages
- heavy execution controls

Mental model:

- start here
- get direction
- leave quickly

## `Planning`

Own only:

- automation on/off
- cadence
- last update
- next update
- plain-language trust and setup guidance for automatic updates

Should not own:

- general workflow progress
- notebook/application triage
- profile editing
- deep diagnostics on the normal user route

Mental model:

- set and trust the update engine

## `Opportunities`

Own only:

- first-pass review of fresh or reviewable roles
- discovery filters and review modes
- deciding whether a role is worth keeping

Should not own:

- full active-application workflow management
- long-lived application notes as the primary use case
- broader workspace orientation

Mental model:

- review new leads
- keep or dismiss

## `Notebook`

Own only:

- active application workflow
- notes
- follow-up planning
- prep work
- pipeline status changes

Should not own:

- general workspace summary
- automation setup
- profile readiness guidance except when directly blocking notebook use

Mental model:

- run the application pipeline

## `Progress`

Should become one of two things:

1. a true timeline/progress surface with meaningful history and milestones
2. or be reduced/merged if it remains too close to `Home`

Right now it risks being a second orientation page without strong enough unique ownership.

Mental model if kept:

- understand momentum over time, not just what to do next

## `Profile`

Own only:

- target-role input
- documents
- profile generation
- profile quality

Should not own:

- broader workspace orientation beyond what is necessary for profile work
- application workflow summaries that belong elsewhere

Mental model:

- maintain the source of truth that drives the rest of the product

## `Companies`

Own only:

- company-centric browsing and future company memory/intelligence

Should not become:

- a second opportunities list
- a generic reporting surface

## Main Findings

## 1. `Home` and `Progress` are too close in purpose

Current state:

- both summarize readiness and next-step context
- both act as orientation layers
- both can send the user into notebook/planning/profile work

Why this matters:

- repeated orientation surfaces dilute the purpose of each page
- users have to infer which page is the “real” overview
- the nav becomes broader without feeling more useful

Required fix:

- make `Home` the fast command page
- make `Progress` either distinctly historical/longitudinal or remove/merge its role

## 2. Some summary blocks appear in too many places

Current examples:

- readiness-style messaging
- profile/documents generation readiness
- workflow blockers
- next-step framing

Why this matters:

- repeated summary furniture makes pages feel box-heavy again
- the same facts are repeated in slightly different wording
- page identity weakens because too many screens try to orient the user

Required fix:

- define one canonical owner for each summary type
- allow other pages to link to that owner instead of re-summarizing everything

## 3. `Planning` must stay narrowly owned

Current state:

- the page is much cleaner after the last audit
- it now feels like automation control instead of ops tooling

Remaining risk:

- it can easily drift back into a generic “system status” page

Required fix:

- keep `Planning` scoped to update control and automation trust only
- route all non-automation workflow questions back to `Home`, `Opportunities`, `Notebook`, or `Profile`

## 4. `Notebook` should be the only true active-work workspace

Current state:

- notebook is already the strongest execution surface in the product
- action plans, prep packets, notes, follow-up logic, and pipeline movement all fit here

Remaining risk:

- nearby routes still carry enough workflow language that notebook can feel less singular than it should

Required fix:

- make notebook the unquestioned owner of active application management
- keep surrounding routes focused on orientation, discovery, or setup

## 5. API ownership of workflow summaries should increase where page overlap remains

Current state:

- several useful read models already exist
- some page identity still depends on frontend composition of shared summary pieces

Why this matters:

- page overlap often comes from frontend recombination of the same base signals
- API-owned read models make it easier to enforce distinct page responsibilities

Required fix:

- define explicit read-model intent by route
- avoid one “everything summary” becoming the source for every page section

## 6. `Progress` needs a binary product decision

Current state:

- it is not wrong
- but it is the least crisply differentiated route

Two valid options:

1. keep it and turn it into a durable timeline/history/throughput page
2. shrink or merge it if it continues to duplicate `Home`

This should be decided early in the next implementation wave, not left ambiguous.

## Proposed Ownership Matrix

### Orientation surfaces

- `Home`
- possibly `Progress` if it becomes true history

### Setup surfaces

- `Onboarding`
- `Profile`
- `Planning`

### Execution surfaces

- `Opportunities`
- `Notebook`

### Expansion surface

- `Companies`

## Action Plan

## Phase 1: Route ownership decisions

1. Define the single primary job of each end-user route.
2. Mark duplicated panels and summaries that violate that ownership.
3. Decide the future of `Progress`:
   - strengthen as history/timeline
   - or reduce/merge

## Phase 2: Summary deduplication

1. Remove repeated readiness/next-step blocks from non-owning pages.
2. Let each page keep only the minimum context needed to do its job.
3. Prefer links/CTAs over repeated explanation panels.

## Phase 3: Read-model alignment

1. Define which route needs which API summary payload.
2. Split route-specific summary needs from global shell needs.
3. Avoid one broad summary payload driving every page shape by accident.

## Phase 4: Navigation and page identity cleanup

1. Make `Home` quick and directional.
2. Make `Planning` purely automation-focused.
3. Make `Notebook` the sole active-work workspace.
4. Make `Progress` either clearly differentiated or reduced.

## Suggested Commit Sequence

1. `docs: define workflow ownership targets for end-user routes`
2. `refactor: narrow home page to direction and next-action ownership`
3. `refactor: keep planning page scoped to automation trust and cadence`
4. `refactor: remove duplicated readiness and blocker summaries from non-owning routes`
5. `refactor: strengthen notebook as the sole active-work workspace`
6. `refactor: decide and implement progress page ownership`
7. `refactor: align route-specific read models with page ownership`
8. `docs: update workflow and roadmap docs after ia cleanup`

## Success Criteria

This audit is successful when:

1. users can name the purpose of each main route in one sentence
2. `Home` is clearly for direction, not execution
3. `Planning` is clearly for automation, not general status
4. `Notebook` is clearly the active application workspace
5. duplicated summary panels are materially reduced
6. route identity feels stronger than component similarity

## Final Recommendation

The previous audit made the product feel less like internal tooling.

This next one should make it feel structurally inevitable.

The right move now is not adding more pages or more features. It is making the existing surfaces unmistakable in purpose, so the product flow becomes:

1. understand what changed
2. review fresh opportunities
3. keep active applications moving
4. adjust setup only when needed

That is the cleanest next step for both product quality and AI-assisted implementation discipline.

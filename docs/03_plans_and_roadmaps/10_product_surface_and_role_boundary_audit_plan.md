# Product Surface and Role Boundary Audit Plan

## Goal

Audit the current web product from a production-readiness perspective with emphasis on:

- what end users should see
- what only admins should see
- where internal/system/debug language leaks into the product
- where workflow responsibility is misplaced onto the user
- where current UX blocks a clean “create account -> look for job -> track positions” experience

This audit also folds in the specific issues observed in review:

- raw technical values in the UI
- user-facing pages that still behave like debugging interfaces
- scrape/scheduler concepts leaking into normal user experience
- broken or unclear pagination
- opportunities detail rail overflow
- schedule trust concerns
- too much uniform card-box UI with weak visual hierarchy

---

## Executive Summary

The main production blocker is no longer just styling. It is boundary failure between:

- product UX
- operational tooling
- internal system vocabulary

Right now the app still exposes too much of the machinery of sourcing:

- scrape
- run states
- failure types
- event types
- scheduler concepts
- diagnostics

That is appropriate for admin/support surfaces. It is not appropriate for the normal user journey.

For the end user, the app should feel like:

1. create account
2. add profile and documents
3. set job preferences
4. receive and review job opportunities
5. move good roles into tracked workflow
6. keep track of the process

The user should not need to understand:

- what a scrape is
- what a callback is
- what `schedule_enqueue_succeeded` means
- whether a run was `PENDING`, `RUNNING`, or `FAILED`
- ingestion quality metrics
- diagnostics windows
- worker-stage failure interpretation

Those are our responsibilities, not the user’s.

The current product still mixes:

- customer UX
- operator UX
- support/debug UX

This audit recommends a hard separation.

---

## Core Product Principle

## End-user app

End users should see only:

- profile setup
- document upload
- search preferences
- automation on/off and schedule preferences in plain language
- job opportunities
- notebook / application tracking
- companies
- simple health/recovery prompts when action is required

## Admin app

Admins should see:

- all scrape stats
- run history
- event feeds
- callback failures
- failure codes
- schedule execution details
- diagnostics
- worker/API health
- forensic detail

## Support/implementation rule

Internal values may exist in API payloads, but they must never be rendered raw into user-facing UI.

Everything user-facing must map to:

- plain-language labels
- clear statuses
- action-oriented next steps

---

## Main Findings

## 1. Internal sourcing language leaks into the user product

This is the biggest production issue.

Examples found:

- `schedule_enqueue_succeeded`
- `schedule_enqueue_failed`
- `scrape`
- `run`
- `callback`
- `failureType`
- `eventType`
- raw status values like `IDLE`, `RUNNING`, `FAILED`

Relevant files:

- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`
- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`
- `apps/web/src/shared/ui/async-states.tsx`
- `apps/web/src/shared/ui/app-shell.tsx`

### Why this is a blocker

- users are exposed to implementation details instead of product meaning
- creates mistrust because the app feels unfinished or internal
- makes the product harder to understand
- shifts operational burden onto the user

### Required fix

Create a strict presentation mapping layer:

- raw API values remain internal
- user-facing components consume mapped labels only

Examples:

- `schedule_enqueue_succeeded` -> `Automatic search updated successfully`
- `schedule_enqueue_failed` -> `Automatic search update failed`
- `FAILED` -> `Needs attention`
- `RUNNING` -> `In progress`
- `PENDING` -> `Queued`

And for end users, many of these should not be shown at all.

---

## 2. Planning/scrape controls are still too exposed to normal users

Relevant files:

- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`
- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`

### Current issue

The product still frames sourcing around:

- manual scrape runs
- diagnostics
- run health
- failure guides
- scheduling internals

That is operator-facing tooling, not customer UX.

### Why this is a blocker

The user should manage outcome, not mechanism.

The right user mental model is:

- “Set how often to refresh opportunities”
- “Pause / resume automatic updates”
- “Last update”
- “Next scheduled update”

Not:

- “Run scrape now”
- “enqueue scrape”
- “callback issues”
- “failure guide”
- “usable run rate”

### Required fix

Split this surface into two products:

## User-facing automation page

Show only:

- automation enabled/disabled
- frequency / cadence
- next refresh time
- last successful refresh
- plain-language problem state if automation is paused or failing

## Admin-only operations page

Keep all current diagnostics there:

- scrape diagnostics
- run health
- failure guide
- schedule execution events
- callback failures
- metrics

User pages should stop using the word “scrape”.

---

## 3. Dashboard still exposes too much operational state

Relevant file:

- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`

### Current issue

The dashboard still includes:

- run counts
- run status
- scrape setup hints
- run snapshot
- sourcing-oriented copy

### Why this is a blocker

The dashboard should answer:

- what should I do next?
- do I have new jobs?
- what applications need attention?
- is my profile ready?

It should not behave like an operator panel.

### Required fix

Redefine dashboard around:

- next action
- new opportunities
- active applications needing attention
- profile completeness
- automation status in plain language

Move all deeper sourcing detail out.

---

## 4. Opportunities page has a real usability bug in the detail rail

Relevant file:

- `apps/web/src/features/job-offers/ui/components/opportunity-details-rail.tsx`

### Current issue

The detail rail uses:

- `xl:max-h-[calc(100vh-8rem)]`
- `xl:overflow-y-auto`

But in actual use the details area can still become effectively taller than the usable viewport, making the bottom controls or content hard to reach.

### Why this is a blocker

The primary review action is in this surface. If the details panel is not fully reachable, the review flow is broken.

### Required fix

- verify the sticky rail and available viewport height together, not just the card itself
- give the rail a controlled layout with explicit internal scrolling regions
- ensure CTA buttons remain reachable on all desktop heights
- test on common laptop viewport heights, not only tall desktop screens

Recommended structure:

- fixed header/meta
- scrollable content region
- sticky footer action bar

---

## 5. Pagination is unclear and uses internal language

Relevant file:

- `apps/web/src/features/job-offers/ui/components/opportunities-list-card.tsx`

### Current issue

Current pagination label:

- `Offset-based paging`

Buttons:

- `Previous`
- `Next`

No useful context:

- current page
- shown item range
- total count meaningfully explained

### Why this is a blocker

- exposes implementation wording
- gives users no sense of location in the result set
- feels unfinished

### Required fix

Replace with user-facing pagination copy:

- `Showing 21-40 of 127 opportunities`
- `Page 2`

If exact page count is unavailable, still show:

- current slice
- visible count
- total available

Never expose “offset-based paging” to users.

---

## 6. Some pages still read like debug/support tools

Relevant files:

- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`
- `apps/web/src/features/tester/ui/tester-page.tsx`
- `apps/web/src/features/ops/ui/ops-page.tsx`
- parts of dashboard/profile/workflow copy

### Current issue

Even outside admin, the app contains copy and components that sound like:

- support tooling
- engineering console
- internal operator guidance

### Why this is a blocker

The app must feel like a job-search workspace, not a deployment console.

### Required fix

Hard role-based product separation:

## End user routes

- no diagnostics
- no raw events
- no failure taxonomies
- no system-centric instructional language

## Admin routes

- keep all current forensic and operational detail

## Transitional rule

If a user-facing page currently needs a debugging block to be usable, that is a product design failure and must be redesigned rather than partially hidden.

---

## 7. Schedule trust is a real product risk

Observed concern:

- it is unclear whether scheduled refresh actually runs reliably
- this needs real validation after 1-2 days

### Why this is a blocker

If automated refresh is core to the product promise, users need to trust it without understanding internals.

### Required fix

This needs both product and ops work.

## Product-facing

User-facing automation state should show:

- `Automatic updates are on`
- `Last update: today at 09:00`
- `Next update: tomorrow at 09:00`
- `Updates are temporarily paused`

## Operational

We need explicit verification:

- did scheduled trigger fire?
- did the run complete?
- did new offers land?
- if not, why?

## Required follow-up

Run a 1-2 day schedule verification pass in production/staging:

- record actual trigger timestamps
- compare to expected cadence
- confirm end-to-end result materialization
- document failure modes

This is not only a UI issue. It is a reliability validation task.

---

## 8. Visual system feels over-boxed and too uniform

Relevant examples across:

- dashboard
- planning
- notebook
- profile
- onboarding
- opportunities

### Current issue

The app is built from many rounded cards, muted panels, inset boxes, and rails.

The result:

- everything looks equally framed
- visual rhythm is repetitive
- pages can feel like “AI-generated boxes on a white page”
- the orange/white soft gradients help, but can also make the app feel pale and flat

### Why this is a blocker

Even when functionally correct, the app can still feel unfinished or generic if the visual hierarchy is weak and repetitive.

### Required fix

Use the existing design system more intentionally:

- fewer universal card wrappers
- more open layouts
- more contrast between primary and secondary sections
- more purposeful use of icons
- stronger section differentiation
- fewer nested rounded surfaces

This is not about “adding random style”. It is about creating a real hierarchy.

---

## 9. Contrast and visual energy need improvement

Current issue:

- white/light panels on very light backgrounds
- subtle gradients with low visual separation
- some pages feel too blank

### Why this matters

- weaker hierarchy
- lower scanability
- product feels passive rather than active

### Required fix

- strengthen tonal separation between page background and surfaces
- create a more distinct visual language for primary actions and active workflow states
- use icons and section accents to create “life” without clutter

This should be solved through system-level styling, not one-off decoration.

---

## 10. App shell still includes non-essential or misleading elements

Relevant file:

- `apps/web/src/shared/ui/app-shell.tsx`

### Current issue

The shell still includes:

- search field that does not read as a complete product feature
- readiness/next run/operator-like summary in sidebar
- technical framing around workspace state

### Why this matters

The shell should orient the user simply:

- where am I
- what can I do here
- how do I move to the next step

### Required fix

Simplify shell to:

- clean navigation
- clear current section
- user identity/account access
- maybe one compact “updates on/off” or “profile incomplete” signal

Remove operator-like shell furniture from user mode.

---

## What Else Should Be Audited

Given current context, the next valuable audits after this one are:

## 1. Information architecture audit

Purpose:

- define exact page ownership
- remove duplicated responsibilities between dashboard/planning/activity/notebook/profile

## 2. Role-based access and product-surface audit

Purpose:

- explicitly define end-user, admin, and support surfaces
- ensure no internal tool leaks into customer UX

## 3. Copy and terminology audit

Purpose:

- remove internal engineering language from end-user product
- standardize statuses, CTA labels, and recovery language

## 4. Reliability and trust audit for automation

Purpose:

- validate whether scheduled updates actually run on time and complete end to end
- define user-safe fallback behavior when automation fails

## 5. Accessibility and responsive audit

Purpose:

- verify panel heights, mobile/desktop behavior, sticky regions, and scroll traps
- confirm critical actions are always reachable

---

## Action Plan

## Phase 1: Immediate production blockers

### 1. Remove raw technical values from user-facing UI

- map all user-visible statuses and event labels
- never show raw event types to end users
- never show words like `schedule_enqueue_succeeded` in product UX

### 2. Move scrape/diagnostics language out of user surfaces

- dashboard
- planning
- job-sources
- shell copy

Replace with plain-language automation wording.

### 3. Fix opportunities detail rail overflow

- make content fully reachable on normal viewport heights
- keep action buttons visible/reachable

### 4. Fix pagination language and context

- remove `Offset-based paging`
- add user-facing item range/page context

### 5. Validate schedule reliability over real elapsed time

- run 1-2 day verification
- document actual behavior
- fix automation if trust is not justified

---

## Phase 2: Product-surface separation

### End-user product should keep only

- onboarding/setup
- profile
- documents
- automation preferences in plain language
- opportunities
- notebook
- companies

### Admin/ops should keep all of

- scrape stats
- scheduler health
- callback failures
- event logs
- run forensics
- diagnostics
- metrics
- rates
- errors

---

## Phase 3: UX cleanup and design hierarchy

- reduce box-over-box composition
- simplify shell
- strengthen hierarchy and contrast
- use iconography intentionally
- make the app feel alive through structure, not decoration overload

---

## Suggested Commit Sequence

1. `refactor: remove scrape diagnostics from end-user planning surfaces`
2. `refactor: map raw workflow and schedule statuses to user-facing labels`
3. `fix: make opportunities detail rail fully reachable on desktop`
4. `refactor: replace internal pagination wording with user-facing paging`
5. `refactor: simplify app shell and remove operator-style user chrome`
6. `refactor: move advanced sourcing/debug details behind admin-only ops flows`
7. `refactor: rebalance surface hierarchy and reduce box-over-box layouts`
8. `docs: document automation trust checks and schedule verification process`

---

## Final Recommendation

The product needs a stricter rule:

end users manage job search outcomes, not sourcing mechanics.

That means:

- hide implementation detail
- map every internal status into human language
- move all diagnostics to admin
- make automation feel trustworthy without exposing internals
- keep user UX centered on jobs, not system behavior

The next frontend/product pass should be treated as a production-boundary cleanup, not only a styling pass.

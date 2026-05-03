# Frontend UI UX Design And Trust Hardening Audit Plan

Last updated: 2026-05-01

## Status

In progress.

Initial implementation started:

1. JS-readable auth cookie mirroring removed from web session bootstrap path
2. auth now restores through httpOnly API cookies plus in-memory client tokens instead of `localStorage`
3. API login, refresh, logout, and JWT guard now accept secure cookie-based session flow
4. server session bootstrap now rehydrates from cookie-backed `/user` lookup instead of readable token duplication
5. shared input/url normalization helpers added and first repeat callers migrated
6. shared workspace surface primitives softened to reduce repeated bordered-card treatment
7. dashboard, planning, notebook, profile, and onboarding received first-pass layout flattening
8. opportunities and company detail routes now use lighter supporting surfaces and shared query-link shaping
9. notebook bulk workflow editor and tag input now reuse centralized trim/normalization helpers
10. planning automation controls now use flatter grouped sections instead of stacked inset panels
11. notebook filters, action plan, and selected-offer workspace now rely more on tonal grouping than nested card chrome

## Goal

Audit and improve the web app so it feels simpler, calmer, and more deliberate while also hardening weak frontend trust boundaries.

This plan is the follow-up to the completed notebook throughput/reminder audit.

The target is not a decorative redesign.

The target is a meaningful frontend quality pass that improves:

1. visual hierarchy
2. layout density and pacing
3. route-level clarity
4. frontend security posture
5. client-side input hygiene
6. state/context ownership

## Why This Audit Is Next

The product is now functionally stronger, but the frontend still shows several recurring problems:

1. too many surfaces use the same bordered rounded card treatment, which makes pages feel box-heavy and visually repetitive
2. shared layout primitives encourage nested panel-inside-panel composition, especially on dashboard, planning, notebook, profile, and onboarding surfaces
3. auth/session bootstrap historically mirrored tokens into `localStorage` and JS-readable cookies, which was a weak trust boundary and an unnecessary XSS risk amplifier
4. frontend input normalization is inconsistent across forms, query params, draft persistence, and filter controls
5. some route-level and global UI state responsibilities are broader than they need to be

This is now a product-quality issue, not just a design preference.

## Current Evidence In Code

Visual density and repeated surface treatment:

- `apps/web/src/app/globals.css`
- `apps/web/src/shared/ui/card.tsx`
- `apps/web/src/shared/ui/dashboard-primitives.tsx`
- `apps/web/src/features/workspace/ui/*`
- `apps/web/src/features/job-offers/ui/*`
- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`

Frontend trust and token handling:

- `apps/web/src/features/auth/model/utils/token-storage.ts`
- `apps/web/src/features/auth/model/context/auth-context.tsx`
- `apps/web/src/shared/lib/auth/server-session.ts`
- `apps/web/src/shared/lib/http/api-client.ts`

Input normalization and form hygiene:

- `apps/web/src/features/onboarding/model/hooks/use-onboarding-page.ts`
- `apps/web/src/features/profile-inputs/model/*`
- `apps/web/src/features/job-sources/model/validation/*`
- `apps/web/src/features/job-offers/ui/components/notebook-offers-list-card.tsx`
- `apps/web/src/features/tester/api/tester-api.ts`

State and context ownership:

- `apps/web/src/shared/store/app-ui-store.ts`
- `apps/web/src/app/providers.tsx`
- route-level feature controllers that still push broad UI concerns through shared global state

## Core Product Principle

The app should feel modern and intentionally designed without defaulting to card stacks everywhere.

That means:

1. fewer borders used more intentionally
2. stronger spacing and typography hierarchy instead of repetitive chrome
3. route sections that breathe and read as one workspace, not a pile of boxed modules
4. client trust boundaries that do not casually duplicate sensitive session state
5. inputs normalized at the edges instead of ad hoc in many components

## Audit Tracks

## Track 1: Visual Language Simplification

Focus:

- reduce box-over-box composition
- reduce repeated border-radius and border usage
- use background, spacing, and type hierarchy more effectively
- keep the app light, modern, and calm without flattening everything into one bland canvas

Questions:

1. which shared surface primitives are overused
2. where does nested panel composition create visual noise
3. which routes should use open layouts versus enclosed cards
4. which borders should remain functional instead of decorative

Expected output:

- updated global surface primitives
- clearer usage rules for `app-surface`, `app-muted-panel`, `app-inset-stack`, `app-utility-rail`, and page headers

## Track 2: Route Layout And Page Hierarchy

Focus:

- dashboard
- planning
- opportunities
- notebook
- profile
- onboarding

Questions:

1. which pages still feel like component grids instead of designed product surfaces
2. where can sections be flattened or merged
3. where should hierarchy rely on whitespace and copy instead of extra containers
4. which pages still feel too dense on desktop or too stacked on mobile

Expected output:

- route-level layout cleanup with better hierarchy and less repeated framing

## Track 3: Frontend Trust Boundaries

Focus:

- token handling
- session bootstrap
- browser storage
- cookie duplication

Problem statement to verify:

- frontend auth state is currently more permissive than it should be because tokens are duplicated into `localStorage` and JS-readable cookies so the server layout can bootstrap a session
- first hardening pass should remove browser-persistent token duplication and let the API own cookie-backed session recovery

Questions:

1. can server bootstrap avoid mirroring sensitive tokens into JS-readable cookies
2. what is the smallest safer session strategy that still works with the current API contract
3. where are auth assumptions duplicated between auth context, token storage, and request helpers
4. what e2e/test updates are required when this is changed

Expected output:

- tighter auth/session bootstrap path
- reduced token duplication
- explicit frontend security notes in standards/docs

## Track 4: Input Sanitization And Client Normalization

Focus:

- form string trimming
- query-param shaping
- URL normalization
- reusable input hygiene helpers

Questions:

1. which forms already use schema-level trimming and which still normalize too late
2. where do arrays and drafts preserve untrimmed or low-signal values
3. where should normalization happen centrally instead of inside submit handlers
4. which UI-facing URL/query builders need stronger edge validation

Expected output:

- shared normalization helpers
- more consistent form-edge sanitation
- less duplicated string hygiene logic

## Track 5: Context And UI State Ownership

Focus:

- auth provider
- app-level zustand store
- route-specific controller hooks

Questions:

1. which UI state should stay global versus route-scoped
2. where are route concerns coupled too tightly to broad providers or stores
3. can notebook/dashboard state be better isolated without breaking current UX
4. where should controllers return tighter view models instead of leaking state wiring details

Expected output:

- cleaner boundaries for shared providers and client state ownership

## Main Findings To Confirm

## 1. The app is visually over-boxed

Working hypothesis:

- the current primitive set makes it too easy to solve every composition problem with another rounded bordered container

## 2. Shared layout primitives are carrying too much design responsibility

Working hypothesis:

- routes need clearer composition rules so design quality does not depend on stacking `app-surface`, `app-inset-stack`, and `app-muted-panel` repeatedly

## 3. Frontend auth storage is too permissive

Working hypothesis:

- browser-persistent token storage is still too permissive for a private workspace app once cookie-backed API sessions are available

## 4. Input hygiene is partly standardized and partly fragmented

Working hypothesis:

- several good schema patterns exist already, but edge normalization is still duplicated and inconsistent across features

## 5. Some global UI state can be narrowed

Working hypothesis:

- current state ownership is acceptable but broader than necessary for a frontend that is trying to stay maintainable as route complexity grows

## Proposed Outcome Model

## Design direction

Should become:

- lighter
- calmer
- more editorial
- more deliberate about where borders and cards actually help

Should avoid:

- flattening everything into whitespace with no structure
- replacing one repetitive primitive with another repetitive primitive
- large redesign churn disconnected from real product flows

## Security direction

Should become:

- stricter about where tokens live
- clearer about what the server bootstraps versus what the client owns
- more defensive around user-entered strings and URLs

## State direction

Should become:

- route-focused where possible
- shared only where there is clear durable value

## Action Plan

## Phase 1: Audit And Primitive Review

1. inventory current surface primitives and where they are overused
2. inventory auth token/session flow in browser and server bootstrap
3. inventory normalization patterns across major forms and filters
4. inventory shared versus route-scoped UI state responsibilities

## Phase 2: Design System And Shared Primitive Cleanup

1. simplify global surface tokens and rounded/bordered defaults
2. define when routes should use open layout, light sectioning, or enclosed surfaces
3. remove nested panel patterns that add chrome without information value

## Phase 3: Route-Level Composition Pass

1. simplify shell/dashboard hierarchy
2. simplify planning and notebook route composition
3. simplify profile and onboarding composition
4. tighten opportunities/detail rail composition

## Phase 4: FE Trust And Input Hardening

1. reduce token duplication and tighten session bootstrap
2. centralize input normalization helpers
3. align form schemas and submit mappers around consistent sanitation rules
4. update tests and docs for the new trust boundary

## Execution Tranche: Workspace UX Flattening And Query Trust

This section turns the audit into a concrete implementation plan for the next frontend-heavy delivery slice.

It is intentionally more specific than the earlier audit tracks and should be treated as the canonical commit plan for this tranche.

### Why This Tranche Is Active Now

The product workflow is stronger than it was a few weeks ago, but the web app still has several credibility problems that are now blocking the next layer of product polish:

1. core routes still feel too boxed and too component-grid-like
2. shell/header composition still makes the workspace feel framed inside cards instead of feeling like one app surface
3. planning still has sticky/layout behavior that looks broken
4. opportunities still behaves too much like an admin list instead of a fast review queue
5. free-text filters still create unnecessary query churn and contribute to `429` pressure
6. route-to-route notebook freshness is not trustworthy enough after mutations
7. companies and profile still show mixed hierarchy quality, weak loaders, and visual imbalance

This is not decorative cleanup. It affects:

- perceived product quality
- request-budget safety
- workflow trust
- route deep-linking quality
- maintainability of future frontend work

### Normalized User-Reported Pain

User feedback for this tranche maps to these concrete product problems:

1. header feels detached because it lives inside another rounded box instead of acting like workspace chrome
2. planning page utility content overlaps nearby sections because sticky behavior is wrong
3. opportunities route is still too box-heavy, especially around filters, counts, and detail surfaces
4. opportunity details rail has weak spacing and too much nested framing
5. opportunities should preserve explicit page-based review, but pagination state should be visible and shareable through the URL
6. opportunities search and tag filters should debounce and persist in URL state
7. notebook should reflect updates after opportunity actions without requiring a hard refresh
8. company route loading and querying still feels rough
9. profile route has poor visual balance and still leaks raw signal keys like `target_roles`
10. toast undo action is visually harsh and inconsistent with the rest of the app

### Execution Rules

These rules should constrain all implementation work in this tranche:

1. main route content should stay open on the page canvas whenever possible
2. widgets, side rails, destructive settings, and dense metadata clusters may stay enclosed
3. avoid box-inside-box composition unless the inner box adds clear information value
4. maximum decorative nesting depth should be `1`
5. free-text server-backed filters must debounce before query execution
6. meaningful route filter state should live in URL query params
7. workflow mutations must refresh or invalidate every affected read model
8. prefer targeted mutable-query refetch rules over making all queries globally aggressive
9. API stays owner of workflow semantics; web improves presentation, state ownership, and trust

### Route-Level Priorities

Execution order for this tranche:

1. app shell and header chrome
2. planning layout and sticky behavior
3. opportunities state, pagination model, and visual density
4. notebook freshness and state ownership
5. companies list/detail query hygiene and loading UX
6. profile hierarchy and label humanization
7. toaster/action visual cleanup
8. regression coverage and doc follow-through

## Detailed Commit Plan

Target commit size for this tranche should usually stay in the `~200-300` changed-line range.

If a slice naturally grows beyond `500+` lines, split it into two commits as described below instead of pushing a bloated mixed commit.

### Commit 1

`docs: activate workspace ux flattening and query trust tranche`

Intent:

- update this file with the concrete execution tranche
- record active route-level pain and implementation rules
- make this document the owner for the upcoming frontend cleanup sequence

Expected scope:

- docs only
- roughly `120-220` changed lines

Acceptance:

- one owning plan exists for the tranche
- route priorities are explicit
- later code commits can reference this file without ambiguity

### Commit 2

`refactor: turn workspace header into full-width shell chrome`

Intent:

- make header start at the sidebar edge and span the workspace width
- remove the floating framed-card feeling from shell chrome

Implementation focus:

- update `apps/web/src/shared/ui/app-shell.tsx`
- reduce or remove the rounded framed wrapper around header content
- preserve back button, mobile nav trigger, user identity, sign-out, and sticky behavior
- adjust shell spacing and divider treatment in `apps/web/src/app/globals.css` if needed

Expected scope:

- roughly `150-260` changed lines

Acceptance:

- header reads as app chrome, not another content card
- shell still works with and without sidebar
- mobile and desktop sticky behavior remain stable

### Commit 3

`refactor: soften shared surface primitives and add open-section defaults`

Intent:

- reduce boxiness at the primitive level before route-specific cleanup

Implementation focus:

- update `apps/web/src/app/globals.css`
- soften `app-surface`, `app-surface-elevated`, `app-muted-panel`, `app-inset-stack`, `app-utility-rail`, and `app-page-header`
- introduce or clarify open-section and tonal-section composition defaults
- preserve enough visual structure for widgets and destructive actions

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- routes are nudged toward spacing and typography rather than extra framed surfaces
- existing pages do not collapse into structureless whitespace

### Commit 4

`fix: stabilize planning sticky behavior and utility rail layering`

Intent:

- remove the sticky overlap bug on the planning route

Implementation focus:

- inspect `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- correct sticky top offsets and z-index layering
- stop the “Current automation” region from sitting over neighboring content
- verify common desktop widths where the issue currently appears

Expected scope:

- roughly `80-180` changed lines

Acceptance:

- no sticky collision remains
- planning content is never visually obscured by the utility area

### Commit 5

`refactor: flatten planning route composition`

Intent:

- simplify planning into one primary automation flow plus one support rail

Implementation focus:

- reduce panel-on-panel composition in `workspace-planning-page.tsx`
- lighten loaders and grouped support sections
- preserve automation trust and update-context visibility without stacking inset blocks

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- planning reads as one route, not several boxed widgets
- support context still exists but no longer dominates the page

### Commit 6

`feat: hydrate opportunities filter state from url query`

Intent:

- make discovery state deep-linkable and reload-safe

Implementation focus:

- sync `mode`, `hasScore`, `search`, `tag`, `focus`, and `offerId` from route query into the route/controller
- normalize route inputs before they reach query builders
- keep offset reset behavior deterministic when the filter set changes

Expected scope:

- roughly `160-240` changed lines

Acceptance:

- reload and direct links preserve discovery state
- browser back/forward returns to the same review slice

### Commit 7

`feat: persist opportunities filter state back to url query`

Intent:

- complete two-way URL state ownership for the discovery route

Implementation focus:

- push meaningful filter changes back to route query params
- avoid noisy or empty params
- preserve selected-offer deep-linking behavior

Expected scope:

- roughly `140-220` changed lines

Acceptance:

- route URL reflects active discovery state
- links are shareable and stable

### Commit 8

`fix: debounce opportunities free-text filters`

Intent:

- stop API calls on every keypress for `search` and `tag`

Implementation focus:

- add debounced handling for opportunities free-text filters
- keep select/toggle filters immediate
- ensure debounce interacts correctly with URL sync and offset reset

Expected scope:

- roughly `120-220` changed lines

Acceptance:

- typing no longer triggers fetch per symbol
- rate-limit pressure is reduced

### Commit 9

`feat: move opportunities pagination state into url query`

Intent:

- keep explicit page-based review while making pagination state shareable and reload-safe

Implementation focus:

- expose `page` and `perPage` in the route query
- derive list offset from page state instead of keeping pagination purely local
- preserve selected-offer deep links and filter query compatibility

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- current page and page size survive reload and browser navigation
- discovery links can point to the right paged slice directly

### Commit 10

`refactor: expand opportunities pagination controls without fake sorting`

Intent:

- make pagination feel deliberate without introducing unsupported sorting behavior

Implementation focus:

- add `perPage` control using the existing backend `limit` support
- keep current API-owned discovery ordering intact
- leave sorting as a future step until the API contract supports it explicitly

Expected scope:

- roughly `120-220` changed lines

Acceptance:

- opportunities route supports user-visible page size control
- no misleading sort control is added without backend support

### Commit 11

`refactor: simplify opportunities toolbar and list density`

Intent:

- reduce box density in the main opportunities pane

Implementation focus:

- flatten filter toolbar
- reduce nested reset/count framing
- simplify row-level surface treatment while preserving scanability

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- main discovery pane reads cleaner and less repetitive

### Commit 12

`refactor: tighten opportunity details rail spacing and hierarchy`

Intent:

- make the selected-offer workspace feel intentional and readable

Implementation focus:

- adjust `apps/web/src/features/job-offers/ui/components/opportunity-details-rail.tsx`
- add better spacing between scroll body, company section, explanation text, timestamp area, and action blocks
- remove nested framing that does not add information value

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- detail rail breathes
- nested box treatment is significantly reduced

### Commit 13

`fix: refresh notebook and discovery read models after cross-route mutations`

Intent:

- remove the stale notebook behavior after opportunity actions

Implementation focus:

- inspect `apps/web/src/shared/lib/query/use-data-sync.ts`
- inspect notebook/discovery query hooks and route mount behavior
- ensure mutations invalidate or refresh:
  - discovery list
  - notebook list
  - notebook summary
  - action plan
  - reminder preview
  - workspace summary
  - focus queues
- add targeted mount-refetch rules for mutable workflow queries if invalidation alone is insufficient

Expected scope:

- roughly `180-300` changed lines

Acceptance:

- save in opportunities, then open notebook, and the new state is visible without hard refresh
- summary widgets stay aligned with list state

### Commit 14 [completed]

`refactor: narrow notebook state ownership`

Intent:

- keep only durable notebook state global and move transient UI concerns closer to the route

Implementation focus:

- audit `apps/web/src/shared/store/app-ui-store.ts`
- keep persisted notebook preferences global
- narrow route-local or purely presentational state where feasible
- reduce broad coupling between controller hooks and the shared store

Expected scope:

- roughly `200-300` changed lines

Acceptance:

- notebook store boundaries become easier to reason about
- route-only UI concerns are less globally coupled

### Commit 15 [completed]

`refactor: flatten notebook route composition`

Intent:

- continue notebook cleanup after freshness/state ownership are fixed

Implementation focus:

- simplify reminder blocks, action-plan framing, and selected-workspace composition
- keep workflow-value widgets but remove decorative nested containers

Expected scope:

- roughly `220-320` changed lines

Acceptance:

- notebook feels like one active-work route, not stacked modules

### Commit 16 [completed]

`fix: debounce and url-sync companies filters`

Intent:

- remove the same query churn pattern from companies

Implementation focus:

- debounce `search` and `location`
- mirror values to route query
- keep reset and deep-linking behavior deterministic

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- companies route no longer fetches on every symbol
- route links preserve current company browse state

### Commit 17 [completed]

`refactor: replace companies loading and list box density`

Intent:

- make company list loading and browsing feel product-grade

Implementation focus:

- replace generic loading with route-specific skeletons
- flatten company list composition
- reduce nested inset-stack use inside company cards while keeping actions visible

Expected scope:

- roughly `180-260` changed lines

Acceptance:

- company route looks intentional in both loading and loaded states

### Commit 18 [completed]

`refactor: flatten company detail composition`

Intent:

- align company detail with the lighter route-composition rules

Implementation focus:

- reduce nested framing in metadata and recent-offers sections
- keep hero/context area open
- preserve outbound actions and related-offer usefulness

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- company detail route feels coherent with opportunities/notebook cleanup

### Commit 19 [completed]

`refactor: rebalance profile route hierarchy and spacing`

Intent:

- fix profile route visual balance and wasted space

Implementation focus:

- make profile input clearly dominant
- reduce awkward empty space below the primary editor
- stop neighboring sections from stretching to unrelated heights when content is short

Expected scope:

- roughly `180-280` changed lines

Acceptance:

- profile route hierarchy matches the actual user task priority

### Commit 20 [completed]

`refactor: humanize profile health labels and simplify health card`

Intent:

- stop exposing raw backend signal names in the product UI

Implementation focus:

- map keys like `target_roles`, `core_competencies`, and `keywords_coverage` to user-facing labels
- simplify card grouping where possible without losing meaning

Expected scope:

- roughly `120-220` changed lines

Acceptance:

- no raw DB-facing labels remain on the profile health surface

### Commit 21 [completed]

`refactor: restyle toast action into lighter undo affordance`

Intent:

- remove the visually harsh black undo action style

Implementation focus:

- update toaster config and/or action rendering
- prefer a lighter icon-led undo affordance while preserving accessibility

Expected scope:

- roughly `80-160` changed lines

Acceptance:

- toast action feels integrated with the app instead of visually breaking it

### Commit 22

`test: lock route query hygiene and workflow freshness regressions`

Intent:

- prevent the same route and query bugs from returning

Implementation focus:

- add unit/integration coverage for:
  - debounce timing
  - URL hydration and writeback
  - profile signal label mapping
- add e2e coverage for:
  - opportunities -> save role -> notebook reflects change
  - opportunities filters survive reload
  - companies filters debounce and survive reload
  - planning sticky area no longer overlaps visible content

Expected scope:

- roughly `220-320` changed lines

Acceptance:

- major tranche behaviors are test-covered

### Commit 23

`docs: update roadmap and frontend standards after ux-query tranche`

Intent:

- make documentation reflect the implemented route, query, and surface rules

Implementation focus:

- update `docs/03_plans_and_roadmaps/01_roadmap.md`
- update `docs/03_plans_and_roadmaps/02_sprint_plan.md`
- update `docs/06_engineering_standards/01_frontend_standards.md`
- update `docs/01_project_context/02_project_state.md` if behavior changed materially

Expected scope:

- roughly `120-220` changed lines

Acceptance:

- docs no longer describe the older box-heavy or query-heavy behavior

## Validation Plan For This Tranche

Required checks:

1. `pnpm --filter web check-types`
2. `pnpm --filter web test`
3. targeted `pnpm --filter web test:e2e`

Run `pnpm smoke:e2e` when:

1. opportunities/notebook mutation flow changes affect seeded cross-route workflow expectations
2. route-level query/state behavior changes influence seeded end-to-end navigation logic

Manual validation checklist:

1. shell header on desktop and mobile
2. planning sticky behavior at multiple viewport heights
3. opportunities typing behavior for `search` and `tag`
4. opportunities `Show more` review flow
5. opportunity details rail spacing on desktop and mobile
6. save a role in opportunities, then open notebook without full-page refresh
7. companies loading, typing, reload, and deep-link behavior
8. profile route with short and long data states
9. toaster undo action appearance and usability

## Out Of Scope For This Tranche

Unless required by a hard dependency, do not fold these into the tranche:

1. backend cursor-pagination redesign
2. new source adapters
3. deeper prep-packet or assistant feature expansion
4. durable async platform migration work
5. major notebook business-logic redesign
6. full visual design-system rewrite

## Follow-On Work After This Tranche

After this tranche, the best next product sequence remains:

1. deepen notebook toward lightweight application CRM behavior
2. continue reliability-first platform work around durable async and source-health gating
3. improve workflow intelligence and explanation quality before source expansion
4. only then revisit second-source rollout

This preserves the existing roadmap rule:

- simplify first
- harden second
- broaden later

## Suggested Commit Sequence

1. `docs: audit frontend ui ux design and trust hardening gaps`
2. `refactor: simplify global web surface primitives and spacing tokens`
3. `refactor: flatten app shell and workspace page hierarchy`
4. `refactor: reduce notebook and planning box density`
5. `refactor: simplify profile onboarding and companies route composition`
6. `refactor: standardize shared form and feedback composition`
7. `fix: tighten frontend token storage and session bootstrap`
8. `refactor: centralize frontend input normalization and safe url shaping`
9. `refactor: narrow shared ui state and context ownership`
10. `docs: update frontend standards and roadmap after web hardening pass`

## Commit Intent Notes

Each commit above should be a meaningful slice of code, not a cosmetic one-line adjustment.

Examples of acceptable scope:

- one shared primitive system plus all directly affected route updates
- one auth/session trust-boundary rewrite plus matching tests
- one normalization utility layer plus migration of multiple forms/features onto it

Examples of unacceptable scope:

- one radius token tweak by itself
- one isolated button style change without broader composition impact
- one single trim call added in one component without system-level cleanup

## Success Criteria

This audit is successful when:

1. the app no longer feels dominated by repeated bordered rounded cards
2. dashboard, planning, notebook, profile, and onboarding read as cleaner product surfaces
3. auth/session bootstrap no longer depends on weak token mirroring patterns
4. input sanitation is more consistent and centralized across the frontend
5. shared versus route-scoped UI state ownership is clearer
6. the result is simpler and more modern without becoming visually empty

## Final Recommendation

The next frontend pass should not chase novelty.

It should remove avoidable visual noise and weak frontend trust patterns while preserving the product structure that is already working.

The right next wave is:

1. simplify
2. harden
3. normalize
4. only then broaden

That is the highest-value path for the web app right now.

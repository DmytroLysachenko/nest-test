# Frontend UI UX Design And Trust Hardening Audit Plan

Last updated: 2026-04-29

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

# Web UI/UX Audit Plan

## Goal

Audit the current `apps/web` experience for clarity, simplicity, visual consistency, and workflow quality.

Target outcome:

- less visual boxing and decorative framing
- clearer page purpose and page-to-page flow
- less explanatory overload
- stronger hierarchy around primary actions
- more intentional iconography and surface design
- better consistency in formatting, interaction patterns, and copy

---

## Executive Summary

The product already has a solid structural foundation:

- pages are feature-oriented
- actions are mostly explicit
- the app has a clear workflow model: onboarding -> planning -> opportunities -> notebook -> profile refinement
- the shared primitives are reusable and reasonably disciplined

The main problem is not missing functionality. The main problem is presentation density and surface inflation.

Right now the UI often says the same thing 2-4 times through:

- hero header
- guidance panel
- journey steps
- utility rail
- cards inside rails
- inline notices inside cards

That makes the app feel heavier than it is. The user is frequently asked to read orientation copy before acting, even on pages that should feel operational and immediate.

Visually, the system leans too hard on rounded panels, glass surfaces, muted boxes, and stacked cards. The result is polished but over-containerized. It risks looking like “white boxes on a soft background” even though there are many tokens and gradients in place.

The next UX/design pass should simplify structure, reduce repeated framing, and establish a more intentional layout language:

- one primary surface per page
- one secondary rail only where it adds real value
- compact status treatment
- fewer instructional paragraphs
- more visual meaning from spacing, typography, iconography, and section rhythm instead of more boxes

---

## What Is Working

### 1. Workflow intent is clear

The app already separates key jobs-to-be-done:

- dashboard for orientation
- planning for sourcing controls
- opportunities for triage
- notebook for active pipeline work
- profile for source-of-truth updates

That is the right direction.

### 2. Shared primitives exist

Files such as:

- `apps/web/src/shared/ui/card.tsx`
- `apps/web/src/shared/ui/dashboard-primitives.tsx`
- `apps/web/src/shared/ui/guidance-panels.tsx`
- `apps/web/src/app/globals.css`

show that the app already has reusable layout and tone primitives. This makes cleanup feasible without a rewrite.

### 3. The visual system is not raw Tailwind chaos

Semantic tokens already exist for surfaces, text, and status colors in `apps/web/src/app/globals.css`. That is a good base for a cleaner system.

---

## Core Findings

## 1. Surface Inflation: too many framed containers

This is the biggest UI issue.

The app repeatedly wraps content in:

- hero shells
- guidance panels
- editorial panels
- utility rails
- muted panels
- cards
- inset stacks

This happens heavily in:

- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`
- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- `apps/web/src/features/profile-management/ui/profile-management-page.tsx`
- `apps/web/src/features/onboarding/ui/onboarding-page.tsx`
- `apps/web/src/features/job-offers/ui/notebook-page.tsx`

### Why it is a problem

- the page hierarchy becomes visually noisy
- primary content and supporting content compete equally
- every section feels equally important
- users have to decode containers before they decode tasks
- the app feels more complicated than the workflow actually is

### Fix direction

- reduce page-level “intro surfaces” to one per page
- allow more sections to live as clean layout bands, not cards
- keep cards only for repeated items, tools, or clearly bounded modules
- remove card-inside-rail-inside-panel compositions where possible
- introduce more open layout with divider rhythm, typography, and spacing doing the work

---

## 2. Too much instructional copy

There is a strong tendency to explain the page, explain the page again, then explain the section.

Examples:

- `workspace-dashboard-page.tsx`
- `workspace-planning-page.tsx`
- `onboarding-page.tsx`
- `profile-management-page.tsx`
- `notebook-page.tsx`

Patterns repeatedly used:

- hero subtitle
- guidance panel description
- card description
- inline notice
- utility rail description

### Why it is a problem

- slows down scanning
- weakens the signal of actual actions
- makes the UI feel operator-facing rather than user-facing
- creates mental fatigue on repeat visits

### Fix direction

- each page gets one core sentence about purpose
- each major section gets either a title or a short description, not both by default
- move explanatory recovery/help copy behind disclosure where it is secondary
- reserve warning panels for real exceptions, not routine orientation

---

## 3. Dashboard tries to do too much

`apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx` is the clearest example of layout ambition exceeding product focus.

It currently includes:

- hero
- next action editorial panel
- overview rail
- six KPI cards
- journey steps
- recovery panel
- funnel section
- focus lane with multiple cards
- recent offers table

### Why it is a problem

- the dashboard is no longer a quick orientation surface
- “where do I start?” is still answered, but only after a lot of scrolling
- some content duplicates Planning, Activity Board, and Notebook

### Fix direction

Reframe dashboard as:

1. current state
2. next action
3. only the most useful summary list

Recommended dashboard structure:

- compact top summary
- one “next best move” block
- three to four KPI metrics max
- one compact focus section
- one recent activity/offers block

Move deeper operational details fully to:

- Planning
- Activity Board
- Notebook

---

## 4. Onboarding is over-explained and over-framed

`apps/web/src/features/onboarding/ui/onboarding-page.tsx` currently stacks:

- hero header
- guidance panel
- onboarding flow card
- step card

Step 1 also contains many grouped controls with multiple explanatory paragraphs.

### Why it is a problem

- onboarding should feel guided and calm, not like a dashboard
- too much framing makes the first-use path feel heavier
- the “advanced” distinction is weak relative to the amount of copy in the main path

### Fix direction

- use a dedicated onboarding layout, not the same page grammar as operational surfaces
- make the stepper the primary shell
- reduce top-of-page framing to one short intro
- make advanced notes more clearly optional and visually de-emphasized
- collapse non-essential explanations into inline helper text only where users actually need it

---

## 5. Notebook and Opportunities have strong workflow logic but still carry too much chrome

Files:

- `apps/web/src/features/job-offers/ui/opportunities-page.tsx`
- `apps/web/src/features/job-offers/ui/notebook-page.tsx`

These pages are closest to the product’s real value, but they still inherit too much page-level ceremony.

### Problems

- notebook has hero + guidance + reminder guidance + action plan + filters + pipeline + list + details
- opportunities still starts with a large hero before the list/detail task starts
- mobile flow relies on scroll-jump behavior after selection, which can feel abrupt
- too many informational wrappers reduce the sense of speed

### Fix direction

- make these pages feel more like workspaces and less like marketing/editorial pages
- shrink headers significantly
- collapse reminder and action-plan summaries into a compact top toolbar row
- keep filters compact and sticky
- make list/detail the visual center immediately
- treat helper copy as secondary disclosure, not permanent furniture

---

## 6. Navigation patterns are inconsistent

Examples:

- `apps/web/src/shared/ui/app-shell.tsx`
- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`
- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`
- `apps/web/src/shared/ui/workflow-recovery-panel.tsx`

Issues include:

- `window.location.href` is used in multiple workflow actions instead of link/navigation-first patterns
- the shell uses a generic back button with `<`
- the shell includes a search input that appears non-functional at the product level
- page entry actions vary between “Open planning”, “Back to workspace”, “Open notebook”, “Open recommended flow”

### Why it is a problem

- the app feels less coherent than the actual architecture
- some actions read like dev-tool navigation, not product action language
- shell controls imply capabilities that may not really exist yet

### Fix direction

- standardize CTA labels by job-to-be-done
- prefer `Link`/router navigation consistently for page moves
- replace text-symbol arrows with icon-based controls
- remove dormant shell search until it is real
- define one navigation language for the app:
  - review
  - plan
  - continue
  - fix
  - open details

---

## 7. Date/time and formatting are inconsistent

Current formatting is spread across many files with direct `toLocaleString()` / `toLocaleDateString()` usage:

- `apps/web/src/shared/ui/app-shell.tsx`
- `apps/web/src/features/workspace/model/workspace-page-helpers.ts`
- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`
- `apps/web/src/features/profile-management/ui/profile-management-page.tsx`
- `apps/web/src/features/profile-management/ui/components/career-profile-versions-card.tsx`
- `apps/web/src/features/companies/ui/*.tsx`
- `apps/web/src/features/ops/ui/ops-page.tsx`
- `apps/web/src/features/job-offers/ui/components/notebook-offers-list-card.tsx`

### Why it is a problem

- inconsistent display style across pages
- locale behavior is not intentionally controlled
- hard to make the product feel polished when time/date language shifts by page

### Fix direction

- centralize all human-facing date/time formatting in shared helpers
- define 3-4 official formats only:
  - short date
  - short date-time
  - relative time
  - status timestamp
- use `Intl.DateTimeFormat`

---

## 8. Iconography is under-designed

The app uses icons in some places, but not as part of a deliberate system.

Examples:

- some pages rely on text-only navigation badges
- some lists use icons from `lucide-react`
- some critical controls still use text glyphs like `=` and `<`

### Why it is a problem

- icons are not reinforcing page meaning consistently
- the shell branding and navigation feel text-token based rather than product-designed
- primary workflows would benefit from clearer visual anchors

### Fix direction

Introduce a small icon language:

- dashboard / overview
- planning / automation
- opportunities / review
- notebook / active pipeline
- profile / source of truth
- activity / timeline
- companies / entity intelligence

Use icons for:

- navigation items
- section headers where useful
- key status summaries
- CTA reinforcement

Do not add icons everywhere. Add them where they improve scan speed.

---

## 9. Visual language is too soft and over-rounded

Current primitives use large radii broadly:

- `.app-hero`
- `.app-surface`
- `.app-surface-elevated`
- `.app-glass-panel`
- `.app-muted-panel`
- `.app-page-header`

This creates a polished but overly cushioned look.

### Why it is a problem

- too many similarly rounded blocks reduce contrast between layouts
- the app risks feeling generically AI-generated
- the product becomes “nice container after nice container” instead of a sharp workflow workspace

### Fix direction

- reduce radius globally for primary surfaces
- reserve larger radii for only a few special components
- reduce the number of glass/muted/elevated surface variants
- make contrast come from structure and spacing, not only container treatment
- use more section rhythm and less “panel stacking”

Recommended design direction:

- calmer, flatter surfaces
- fewer gradients
- stronger typography
- more deliberate whitespace
- more use of lines/dividers and subtle section bands

---

## 10. Some UI patterns read as internal/operator tooling

This is especially visible in:

- Planning
- Ops
- parts of Profile
- some workflow notices

### Why it is a problem

- product copy often explains the system’s internal logic instead of the user’s task
- the app can feel like a control console instead of a decisive job-search workspace

### Fix direction

- rewrite visible copy toward user intent
- reserve system/process wording for diagnostics or admin surfaces only
- tighten descriptions from “what the system does” to “what the user should do next”

---

## 11. Accessibility and guideline gaps still exist

Against the fetched Vercel web-interface guidelines, notable gaps include:

- non-`Link` navigation via `window.location.href`
- repeated hard-coded locale formatting instead of shared `Intl.*`
- some placeholders do not follow a consistent example/ellipsis style
- the app shell back/menu controls rely on text glyphs instead of clearer iconography
- several pages may be over-dependent on sticky/scroll behavior rather than explicit structural hierarchy

This is not a broken accessibility state, but it is a sign that design quality and implementation quality are drifting apart in small ways.

---

## Page-by-Page Audit

## Dashboard

File:

- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`

### Problems

- too many sections for a “home” surface
- too much duplication with Planning / Activity / Notebook
- visual competition between KPI grid, funnel, focus lane, and recent offers
- direct `window.location.href` action usage

### Recommended fixes

- reduce the dashboard to orientation + next action + one summary list
- move funnel and some focus content to Activity Board
- keep no more than 4 KPI cards
- make the hero shorter and more task-focused

## Planning

File:

- `apps/web/src/features/workspace/ui/workspace-planning-page.tsx`

### Problems

- useful, but too many guidance blocks and diagnostics panels
- reads like a diagnostics hub before it reads like a planning tool
- failure guide, automation snapshot, run health, diagnostics, and job sources all compete

### Recommended fixes

- split primary planning controls from diagnostics
- make diagnostics secondary tabs or collapsible sections
- keep the main page centered on “run now / schedule / current health”

## Opportunities

File:

- `apps/web/src/features/job-offers/ui/opportunities-page.tsx`

### Problems

- large hero delays entry into the list/detail workflow
- rail language is solid, but the shell still feels too ceremonial

### Recommended fixes

- use a compact workspace header
- bring the list/detail split above the fold more aggressively
- make details feel like a review drawer/rail, not a separate editorial section

## Notebook

File:

- `apps/web/src/features/job-offers/ui/notebook-page.tsx`

### Problems

- too many top-of-page informational sections before the work starts
- reminder preview, action plan, filters, list, pipeline, and details all compete

### Recommended fixes

- merge reminder summary and action-plan summary into a compact workflow bar
- collapse low-priority explanatory copy
- make filter, list, and detail workspace the dominant layout

## Profile

File:

- `apps/web/src/features/profile-management/ui/profile-management-page.tsx`

### Problems

- too many sections with equal visual weight
- mixes profile workflow, document workflow, recovery, account activity, and danger zone on one page
- account management reads as a first-class task even though it is secondary

### Recommended fixes

- keep profile editing + readiness + generation as the main canvas
- demote account activity and danger zone to a settings subsection
- consolidate recovery messaging

## Onboarding

File:

- `apps/web/src/features/onboarding/ui/onboarding-page.tsx`

### Problems

- too much framing for a guided flow
- step 1 is long and dense
- advanced notes are present, but the whole page still feels “advanced”

### Recommended fixes

- use a focused wizard shell
- reduce top intro content
- tighten labels and helper copy
- make step completion cues stronger and cleaner

## Auth

Files:

- `apps/web/src/features/auth/ui/auth-page-shell.tsx`
- `apps/web/src/features/auth/ui/login-form.tsx`

### Problems

- auth shell still uses a large hero on desktop for a simple task
- login card is visually fine, but the whole experience is more embellished than necessary

### Recommended fixes

- simplify auth layout further
- keep branding, but reduce promotional tone
- make the form the obvious center

---

## Recommended Design Direction

## Principle 1: Fewer surfaces, stronger hierarchy

- one primary surface per page
- one secondary rail only when it adds real workflow value
- avoid stacked intro blocks

## Principle 2: Short copy, stronger labels

- short titles
- short helper text
- specific CTA labels
- no repeated explanation of the same workflow

## Principle 3: Workspace-first, not dashboard-first

Especially for Opportunities and Notebook:

- list + detail + action should dominate
- hero and guidance should shrink

## Principle 4: A sharper visual system

- smaller radius
- fewer glass variants
- fewer nested muted panels
- stronger icon system
- stronger typography hierarchy

## Principle 5: Consistency through tokens and helpers

- shared date/time formatting
- shared icon map
- shared CTA wording rules
- shared compact header pattern for workspace pages

---

## Proposed Implementation Streams

## Stream A: Layout simplification

- reduce hero height and copy on all main pages
- remove redundant guidance panels
- replace some cards with open sections
- simplify dashboard first

## Stream B: Design system cleanup

- rationalize surface primitives
- reduce radii
- define “page shell / section / tool / repeated item” surface rules
- create icon mapping for navigation and key statuses

## Stream C: Workflow clarity

- tighten CTA labels
- standardize page entry actions
- remove dead shell search until implemented
- reduce navigation ambiguity

## Stream D: Formatting and implementation polish

- centralize date/time formatting via `Intl.DateTimeFormat`
- replace `window.location.href` navigations where appropriate
- standardize placeholders and helper text
- review mobile jump/scroll behavior on split layouts

---

## Suggested Commit Sequence

1. `refactor: simplify page-level headers and guidance surfaces`
2. `refactor: reduce dashboard density and move secondary content out`
3. `refactor: make notebook and opportunities workspace-first`
4. `refactor: tighten profile and onboarding layout hierarchy`
5. `refactor: unify navigation actions and shell controls`
6. `refactor: centralize date formatting and visible copy rules`
7. `feat: add shared iconography system for nav and workflow states`
8. `refactor: normalize surface tokens, radii, and section patterns`

---

## Priority Order

### High

- reduce dashboard density
- simplify notebook and opportunities headers/chrome
- reduce card stacking across major pages
- centralize date formatting
- remove inconsistent navigation patterns

### Medium

- redesign onboarding shell
- demote secondary content on profile page
- introduce icon system
- simplify auth page

### Lower

- deeper typography polish
- optional visual refinement of gradients and decorative backgrounds
- secondary pass on admin/tester surfaces

---

## Final Recommendation

Do not approach the next frontend pass as “make it prettier”.

The right move is:

1. reduce structural noise
2. sharpen workflow hierarchy
3. simplify copy
4. standardize shared interaction/design patterns
5. then polish visuals

If this order is reversed, the app will look nicer but still feel heavier than it should.

The product already has enough capability. The next UX win is making that capability feel obvious, calm, and fast.

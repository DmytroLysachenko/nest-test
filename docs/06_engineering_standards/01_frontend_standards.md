# Frontend Standards

Last updated: 2026-05-03

## Purpose

This document defines mandatory frontend architecture and coding standards for `apps/web`.

Goals:

- maintainability
- scalability
- testability
- consistency across contributors and AI-generated code

## Stack and Ownership

- Framework: Next.js App Router
- Server state: TanStack Query only
- Client/UI state: Zustand only
- Form stack: React Hook Form + Zod (`@hookform/resolvers/zod`)
- Reusable UI primitives: shadcn-based `@repo/ui` and `src/shared/ui`

Ownership boundaries:

- `features/*` owns feature behavior and feature composition.
- `shared/*` owns cross-feature abstractions and generic primitives.
- `app/*` owns routing, top-level providers, and route-scoped composition only.

## Mandatory Folder Structure

Use one of these two variants.

Complex feature (default when feature has forms/mutations/derived UI state):

```text
src/features/<feature>/
  api/          # endpoint clients, query/mutation request builders
  model/
    hooks/      # hook split rules below
    state/      # feature-local stores/context adapters
    validation/ # zod schemas and form mapping
    types/      # feature-local types/view models
    constants/  # feature-scoped constants
    utils/      # feature-scoped helpers
  ui/           # feature UI composition
  lib/          # optional feature-only helpers
  index.ts      # public feature exports
```

Notes:

- Simple feature variant is allowed when complexity is low (few files, read-only UI):

```text
src/features/<feature>/
  api/
  ui/
  index.ts
```

- Promote simple feature to complex structure once local state/forms/derived logic grows.
- For small features that already have `model/`, a flat `model/*` is allowed temporarily, but once 3+ files exist, split into the folders above.
- Avoid treating `model` as a mixed dump folder.

Shared:

```text
src/shared/
  api/          # cross-feature API helpers/contracts when needed
  config/       # env/config access
  lib/
    http/       # api client and errors
    query/      # query client + query key helpers
    utils/      # split by concern (no mega utils file)
  store/        # global Zustand stores
  types/        # reusable API and shared types
  ui/           # reusable abstract components
```

UI rules:

- Prefer adding/reusing primitives in `shared/ui` before creating one-off feature-specific base components.
- If a component may be reused across pages/features, move it to `shared/ui`.
- Feature code should import UI primitives from `shared/ui/*` (not directly from `@repo/ui/components/*`).

## Route and Page Rules

- `src/app/**/page.tsx` must be thin: route composition + page-scoped context only.
- Page files must not contain large business logic or deep endpoint orchestration.
- Do not place utility logic in route files.

## State Management Rules

- TanStack Query is the source of truth for server data.
- Zustand stores only client state:
  - UI toggles
  - page preferences
  - transient workflow selections
- Never duplicate server entities from Query cache into Zustand.
- Keep route-only orientation state local to the owning route or feature hook. Do not add app-global Zustand state unless multiple routes genuinely read and mutate it.

## Component Rules

- Reusable/abstract components go to `shared/ui`.
- Feature-specific UI goes to `features/<feature>/ui`.
- Prefer `@repo/ui` components as baseline, then wrap/customize in `shared/ui` for project-specific look/behavior.
- Avoid hardcoded one-off variants when a reusable prop-based abstraction can be used.
- Keep components focused; extract sections into subcomponents when file grows complex.

## Hooks and API Rules

- Feature hooks live in `features/<feature>/model/hooks`.
- API calls must go through `shared/lib/http/api-client.ts`.
- Do not call `fetch` directly in feature UI or hooks.
- Keep query keys stable and explicit; avoid ad-hoc key shapes.
- Use shared query/error helpers for consistency:
  - `shared/lib/query/authed-query-options.ts` for token-gated query options.
  - `shared/lib/query/invalidate-query-keys.ts` for multi-key invalidation.
  - `shared/lib/http/to-user-error-message.ts` for normalized user-facing errors.
  - `shared/lib/forms/set-root-server-error.ts` for form-root server error handling.

Hook composition is mandatory for medium/large features:

- `use-<feature>-queries.ts`:
  - contains only `useQuery` calls and query-derived selectors.
  - no write side-effects (`POST/PATCH/DELETE`) and no form submission orchestration.
- `use-<feature>-mutations.ts`:
  - contains only `useMutation` calls and invalidation logic.
  - owns success/error notification behavior (toasts) and mutation-side effects.
- `use-<feature>-<page|panel|controller>.ts`:
  - composes query + mutation hooks and local UI state.
  - must stay orchestration-only; avoid embedding raw transport logic.

Anti-patterns (do not do):

- one "god hook" with many unrelated reads/writes.
- mixing API payload shaping, form validation, and UI rendering logic in one place.
- direct `fetch` in controller hooks.
- placing `useQuery`/`useMutation` directly in `ui/*` components (move to `model/hooks`).

Data shaping:

- Avoid exposing raw DTOs directly to UI when not needed.
- Prefer one of:
  - API-level mapper (e.g. `get<Job>Preview`) in feature `api/`.
  - Query `select` mapper in feature hook.
- Hook return value should be UI-ready (minimal required fields, no transport noise).

Notifications:

- Use `sonner` via `shared/lib/ui/toast.ts` only.
- Success/error feedback for mutations should be shown through shared toast wrappers.
- Keep toasts concise and action-oriented.
- Prefer light, integrated action affordances over heavy filled blocks for inline toast actions such as undo.

Forms:

- Default to React Hook Form + Zod for non-trivial forms.
- Keep schemas in `features/<feature>/model/validation`.
- Keep submit/mutation orchestration in hooks (`model/hooks`), not in route files.
- Use `shared/lib/forms/zod-form-resolver.ts` as the single resolver bridge for RHF + Zod typing.
- Reuse shared edge-normalization helpers from `shared/lib/utils/*` for trim/filter/url shaping logic instead of re-implementing ad hoc `trim()` and path cleanup in multiple features.

## Auth And Trust Boundary Rules

- Do not mirror auth tokens into JS-readable cookies for server bootstrap convenience.
- Do not persist long-lived auth tokens in `localStorage` when the API already supports httpOnly cookie session recovery.
- Current preferred model is: API owns httpOnly auth cookies, the client may keep short-lived access tokens in memory only, and server bootstrap may resolve session state by forwarding cookies to the API.
- If the frontend needs a session placeholder for query gating, it must be a non-secret sentinel value, not a mirrored credential.

## Route Query And Filter Rules

- Route-level filter state that matters to navigation, sharing, reload, or back/forward behavior must live in the URL query, not only in local component state.
- Prefer human-readable query params that mirror the product language of the route (`page`, `perPage`, `search`, `tag`, `mode`, `location`).
- Free-text server filters must debounce before they update route query or trigger a new request.
- Default debounce target for free-text server filters is `350-400ms` unless the route has a stronger user-experience reason to differ.
- Immediate controls such as toggles, tabs, and select inputs may update the route query synchronously when the request budget is low and the user intent is explicit.
- When debounced filters change the result set, reset pagination to the first page unless the route has a documented reason not to.
- Prefer shared query/path shaping helpers from `shared/lib/utils/*` instead of route-local string concatenation for URL updates.

## Query Freshness Rules

- Route controllers must invalidate every affected read model after workflow mutations; do not assume one list invalidation is enough.
- Mutable workflow routes such as discovery, notebook, company research, and dashboard workflow summaries may opt into targeted mount refetch behavior when stale or invalidated.
- Prefer narrow `refetchOnMount` or explicit invalidation on mutable routes instead of making global query defaults chatty.
- When a route-to-route workflow handoff is user-visible, verify freshness behavior with regression tests before considering the slice done.

## Workspace Surface Composition Rules

- Start route composition by deciding what is:
  - primary page content
  - support utility
  - dense factual widget
  - destructive or exceptional state
- Keep primary page content open on the canvas whenever possible.
- Use enclosed surfaces for:
  - widgets
  - utility rails
  - compact metrics
  - action clusters that need explicit separation
  - destructive or exceptional messaging
- Do not wrap a page header, page body, and inner section in three visually similar bordered surfaces just to create hierarchy.
- If an inner box does not add new information architecture, remove it and rely on spacing, typography, or tonal background instead.
- Default nesting depth should stay at `1` or less across workspace routes.
- Shared surface primitives must encourage this behavior:
  - `app-surface` for meaningful containers
  - `app-tonal-section` or equivalent for open grouped content
  - `app-utility-rail` for side guidance
  - `app-inset-stack` only when truly dense grouping is required
- Workspace routes should feel related:
  - shell
  - dashboard
  - planning
  - opportunities
  - notebook
  - companies
  - profile
- A route should not look calmer only because it has less data; composition quality must scale with real content density.

## Regression Coverage Rules

- Add hook tests when changing:
  - debounced route filters
  - URL hydration/writeback behavior
  - pagination state ownership
  - mutation invalidation and refetch wiring
- Add component tests when visual or interaction affordances change in meaningful user-visible ways, especially for:
  - loaders
  - empty states
  - selected-workspace/detail rails
  - toast actions
- Prefer route-controller tests for URL/query/state choreography instead of only testing leaf inputs.
- When a route depends on debounced values, assert both halves:
  - no early URL/request change before debounce settles
  - expected URL/request/state after debounce settles
- When a mutation should affect another route, add at least one regression test proving the affected read model is invalidated or refetched.

## TypeScript Rules

- `type`-first convention.
- Use `interface` only when declaration merging or explicit interface extension semantics are required.
- Prefer explicit API DTO types in `shared/types/api.ts`.
- Feature-specific view types stay local in feature `model`.
- Do not introduce unclear abbreviations in names. Prefer full descriptive identifiers such as `jobPosition`, `careerProfile`, `requestIdentifier`, and `workspaceSummary`.
- Single-letter or compressed aliases are allowed only for tiny callback parameters that never leave a 1-3 line local scope.

## UI-Safe View Models

- Controller hooks and shared providers must return UI-safe defaults for optional arrays and nested objects.
- Components must not assume server payload completeness when rendering private dashboard surfaces.
- Normalize partial API payloads in `api/` mappers, query `select`, or controller hooks before they reach `ui/*`.
- Prefer descriptive, render-ready view models over optional chaining spread throughout components.

## Imports and Exports

- Prefer feature public entry (`features/<feature>/index.ts`) from other features/routes.
- Avoid deep cross-feature imports into internal files.
- Keep import ordering deterministic (handled by ESLint/Prettier rules).

## Testing Rules

- Add tests next to changed frontend behavior.
- Minimum per change:
  - feature hook/store tests for business logic
  - component interaction tests for critical user flows
- Keep smoke compatibility for cross-service flows.

## Definition of Done (Frontend)

1. Feature follows folder standards above.
2. Server state and client state responsibilities are not mixed.
3. Reusable UI stays abstract and prop-driven.
4. `pnpm --filter web check-types` passes.
5. `pnpm --filter web test` passes.
6. Relevant docs are updated when conventions or architecture change.

## Visual Consistency

- Maintain a single color and spacing system across screens.
- Light/dark theming is allowed but must use centralized tokens/CSS variables.
- Do not mix inconsistent ad-hoc palettes between features.
- Prefer semantic token classes (`text-app-danger`, `bg-surface-muted`, `border-app-success-border`, etc.).
- Avoid direct Tailwind palette classes (`text-rose-*`, `bg-emerald-*`, `text-slate-*`) unless the color is a documented one-off visualization exception.
- Run `pnpm --filter web ux:check` for token-policy and route-boundary guardrails.

## Desktop Design Direction

- Default workspace direction is light-first and desktop-first.
- Prefer tonal layering, spacing, and typographic hierarchy over heavy border grids.
- Treat the shell header as workspace chrome, not as another floating content card.
- Use shared page composition primitives before inventing route-local layouts:
  - shell
  - editorial sections
  - utility rails
  - inset stacks
  - metric tiles
- Prefer open sectioning, tonal grouping, and whitespace before adding another bordered card. Borders should communicate separation, not act as default layout filler.
- Main route content should usually stay open on the page canvas; enclosed cards are for widgets, utilities, destructive settings, or dense factual clusters.
- Avoid box-inside-box composition unless the inner surface adds real information value. As a default rule, keep visual nesting depth at `1` or less.
- Treat dashboard, planning, notebook, activity, and profile as one connected workspace family.
- Preserve route structure and functionality during visual redesigns; improve composition before adding new interactions.
- Empty, hidden, degraded, and blocked states must feel intentional and informative, not like raw placeholder boxes.

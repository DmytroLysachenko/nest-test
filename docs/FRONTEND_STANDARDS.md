# Frontend Standards

Last updated: 2026-02-25

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

Forms:
- Default to React Hook Form + Zod for non-trivial forms.
- Keep schemas in `features/<feature>/model/validation`.
- Keep submit/mutation orchestration in hooks (`model/hooks`), not in route files.

## TypeScript Rules

- `type`-first convention.
- Use `interface` only when declaration merging or explicit interface extension semantics are required.
- Prefer explicit API DTO types in `shared/types/api.ts`.
- Feature-specific view types stay local in feature `model`.

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

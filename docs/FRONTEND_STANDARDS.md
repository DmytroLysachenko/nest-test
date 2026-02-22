# Frontend Standards

Last updated: 2026-02-22

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
- Reusable UI primitives: `@repo/ui` and `src/shared/ui`

Ownership boundaries:
- `features/*` owns feature behavior and feature composition.
- `shared/*` owns cross-feature abstractions and generic primitives.
- `app/*` owns routing, top-level providers, and route-scoped composition only.

## Mandatory Folder Structure

For each feature:

```text
src/features/<feature>/
  api/          # endpoint clients, query/mutation request builders
  model/        # hooks, local state adapters, view models, feature-local types
  ui/           # feature UI composition
  lib/          # optional feature-only helpers
  index.ts      # public feature exports
```

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
- Avoid hardcoded one-off variants when a reusable prop-based abstraction can be used.
- Keep components focused; extract sections into subcomponents when file grows complex.

## Hooks and API Rules

- Feature hooks live in `features/<feature>/model`.
- API calls must go through `shared/lib/http/api-client.ts`.
- Do not call `fetch` directly in feature UI or hooks.
- Keep query keys stable and explicit; avoid ad-hoc key shapes.

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

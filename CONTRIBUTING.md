# Contributing Standards

This repository follows strict consistency rules to keep the codebase readable, maintainable, and safe for fast iteration.

## Core Principles

- `SOLID`: keep responsibilities small and explicit; avoid hidden coupling.
- `DRY`: extract shared logic when duplication appears in 2+ places.
- `KISS`: prefer simple, explicit implementations over abstractions that are not yet needed.
- Module-first design: business logic belongs in feature/domain modules, not in route/controller shells.

## Monorepo Conventions

- Shared UI primitives must come from `@repo/ui` (shadcn-style components).
- Shared lint and TS configs must come from `@repo/lint-config` and `@repo/ts-config`.
- Prefer workspace packages for reusable logic (`packages/*`) before app-local duplication.

## Frontend Architecture (`apps/web`)

- Feature-sliced boundaries:
  - `src/app`: routing + composition only
  - `src/features/*`: feature-specific API/model/UI
  - `src/shared/*`: cross-feature concerns only (http, query, config, common UI)
- No business logic in `page.tsx` files.
- API calls must go through env-based configuration (`NEXT_PUBLIC_API_URL`).
- Use `@repo/ui/components/*` for UI primitives.

## Backend Architecture (`apps/api`, `apps/worker`)

- Controllers orchestrate; services implement domain behavior.
- DTOs validate external input; services validate business invariants.
- Keep state transitions explicit and testable (e.g., run lifecycle status changes).
- Idempotency required for worker callbacks and retryable endpoints.

## Testing Requirements

- Unit tests for pure/domain logic changes.
- Integration or e2e coverage for cross-module workflow changes.
- New features should include at least one happy-path and one failure-path test.

## API and Environment

- Never hardcode environment-specific URLs/credentials.
- Local dev defaults are allowed only in local/dev context.
- Production configuration must be provided via env vars/secrets.

## AI-Assisted Code Generation Rules

- Generated code must respect this document and existing module boundaries.
- Prefer modifying existing modules over adding parallel patterns.
- Do not introduce large framework-specific abstractions without clear need.
- Keep generated code small, reviewable, and covered by tests.

## Pull Request Checklist

- [ ] Design follows SOLID/DRY/KISS and module boundaries.
- [ ] No duplicated business logic introduced.
- [ ] Lint, typecheck, and tests pass for changed packages.
- [ ] Env/config changes documented.
- [ ] Docs updated when behavior or workflows changed.
- [ ] Required CI checks pass: `CI Verify` + `Smoke Gate`.
- [ ] If release-related, release candidate workflow and artifact metadata are attached.

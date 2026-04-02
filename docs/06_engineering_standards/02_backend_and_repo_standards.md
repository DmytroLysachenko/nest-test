# Backend And Repo Standards

Last updated: 2026-04-02

## Purpose

This document defines mandatory engineering standards for `apps/api`, `apps/worker`, `packages/db`, shared packages, and cross-repo delivery.

It complements `docs/06_engineering_standards/01_frontend_standards.md` and exists to keep the rest of the codebase understandable to humans first, while still being efficient for AI-assisted delivery.

Primary goals:

- maintainability
- modularity
- explicit ownership
- predictable contracts
- production-safe change velocity

These rules are grounded in:

- SOLID
- DRY
- KISS

## Core Principles

### SOLID

- Single Responsibility:
  - one module should own one kind of decision
  - one service should not simultaneously own orchestration, ranking, DTO shaping, parsing rules, and persistence helpers if those concerns can be separated cleanly
- Open/Closed:
  - extend through focused modules, helpers, or adapters instead of repeatedly editing one god file
- Liskov Substitution:
  - do not create fake abstractions or inheritance trees unless they model a real interchangeable contract
- Interface Segregation:
  - keep DTOs, helper inputs, and service APIs narrow and explicit
- Dependency Inversion:
  - feature logic should depend on explicit contracts and typed helpers, not hidden cross-feature assumptions

### DRY

- Do not duplicate business rules between API, worker, and web.
- Shared normalization, matching rules, and persistence helpers belong in one clear owner.
- Reuse existing modules before introducing a second near-identical helper.
- Avoid "copy with slight edits" service methods. Extract the shared branch instead.

### KISS

- Prefer straightforward modules and data flow over speculative abstractions.
- Do not introduce factories, strategy registries, or class hierarchies without immediate need.
- Keep hot-path business rules deterministic and readable.
- Optimize for the next maintainer being able to trace a flow quickly.

## Repo Ownership Boundaries

### `apps/api`

- Owns user-facing orchestration, authenticated workflow behavior, read models, and persistence coordination.
- May call shared DB helpers and pure feature-local helpers.
- Must not duplicate scraping/parsing behavior that belongs to the worker.

### `apps/worker`

- Owns source execution, parsing, normalization preparation, and callback delivery.
- Should stay source-adapter-oriented.
- Must not own user workflow logic or notebook decisions.

### `packages/db`

- Owns schema, migrations, seeds, shared SQL-oriented helpers, and catalog persistence utilities that must be reused by API and worker.
- Schema changes must be migration-driven.

### `apps/web`

- Owns UX composition only.
- Must not re-implement API business rules that can live in a server read model.

## API Feature Structure Rules

Each API feature should be understandable as a small set of clearly named modules.

Preferred shape for medium/large API features:

```text
src/features/<feature>/
  dto/                    # request and response contracts only
  <feature>.controller.ts # thin transport layer
  <feature>.module.ts
  <feature>.service.ts    # orchestration and primary use cases
  <feature>-*.ts          # focused pure helpers / mappers / derivation modules
```

Examples of good feature-local modules:

- `<feature>-read-model.ts`
- `<feature>-workflow.ts`
- `<feature>-ranking.ts`
- `<feature>-mapper.ts`
- `<feature>-filters.ts`
- `<feature>-validation.ts`
- `<feature>-diagnostics.ts`

## Service Design Rules

### Services should be orchestration-first

A service class should primarily do these things:

- define the use-case entrypoints
- coordinate DB calls
- call shared feature-local helpers
- enforce transaction/order of operations
- translate domain failures into stable API errors

Services should not become dumping grounds for:

- large pure transformation blocks
- repeated DTO mapping branches
- ranking heuristics unrelated to persistence
- parsing/normalization helpers that can be pure modules
- dozens of private methods with unrelated responsibilities

### Large service split rule

When a service starts accumulating mixed concerns, extract modules by responsibility, not by arbitrary file length.

Split triggers:

- the service owns 3 or more different concern types
- top-level helper blocks start growing above a few dozen lines
- many private methods operate only on in-memory data
- multiple endpoints reuse the same derivation or mapping logic
- the file becomes slow to scan because transport, SQL, and shaping logic are interleaved

Preferred extraction order:

1. pure constants and preference defaults
2. pure derivation helpers
3. DTO/read-model mappers
4. ranking/filter logic
5. workflow mutation helpers
6. only then consider a second service if there is a true use-case boundary

### What not to do

- Do not split one service into many tiny services that all know each other’s internals.
- Do not move everything into `utils.ts`.
- Do not create shared helpers that are really feature-specific.
- Do not use inheritance to share feature service logic.

## Controllers And DTO Rules

- Controllers must stay thin:
  - validation boundary
  - auth boundary
  - direct call into feature service
- Request/response DTOs must stay explicit and version-friendly.
- Do not expose raw DB rows directly to controllers or web clients.
- Keep compatibility additive whenever possible.

## Read Model Rules

- API should expose UI-ready read models for product surfaces.
- The web should not be forced to reconstruct workflow meaning from raw fields if API can derive it deterministically.
- Read-model shaping belongs in API feature modules, not in controllers and not duplicated in web hooks.

## Worker And Source Adapter Rules

- Keep source-specific scraping logic isolated by source.
- Parsing should distinguish:
  - raw observation
  - normalized fields
  - diagnostics / sparse-field classification
- Do not mix worker transport concerns with parser heuristics in the same helper when they can be separated.
- Use conservative extraction defaults for sparse or non-IT pages.

## Database And Query Rules

- `packages/db` is the only source of truth for schema definitions.
- Migrations must accompany meaningful schema changes.
- Queryable structured data should not stay trapped inside long-lived JSON if it drives filters, ranking, joins, or diagnostics.
- Use relation tables for repeated structured facts instead of stuffing arrays into one JSON blob.
- Add indexes deliberately for hot query paths and relation joins.

## Error Handling Rules

- Failures should be classified, not only logged.
- Use stable top-level API error shapes.
- Avoid leaking raw provider payloads, secrets, or tokens.
- Keep operational diagnostics rich enough for support without requiring log archaeology.

## Testing Rules

Minimum expectation for refactors and architecture changes:

- targeted tests for changed feature logic
- typecheck for affected app/package
- `pnpm smoke:e2e` when flow behavior or cross-service contracts may be affected

For refactors specifically:

- prefer behavior-preserving extractions
- keep tests green before and after the split
- avoid mixing architecture cleanup with unrelated feature changes unless the refactor is necessary to land the feature safely

## Documentation Rules

When architecture or conventions change:

- update this doc if the rule is durable
- update `docs/04_architecture_and_data/01_decisions.md` if the boundary is architectural
- update `docs/00_documentation_system/02_implementation_history.md` for meaningful repo shifts
- update `docs/00_documentation_system/03_code_to_docs_map.md` when ownership expectations change

## Definition Of Done For Modularization Work

Modularization work is done when:

1. the service or feature has clearer responsibility boundaries
2. extracted modules have names a human can understand without opening all of them
3. API behavior is preserved or intentionally updated with docs/tests
4. changed tests and checks pass
5. no "temporary helper" files or ambiguous catch-all modules remain

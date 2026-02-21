# AGENTS.md

## Purpose
This file defines how agents should work in this monorepo to keep delivery consistent, maintainable, and production-oriented.

Primary project context lives in:
- `README.md`
- `docs/CODEX_HANDOFF.md`
- `storypoints.md`
- `docs/PROJECT_STATE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/RUNBOOK.md`

If instructions conflict, follow this order:
1. Direct user request
2. `AGENTS.md`
3. `README.md` and `docs/*`
4. `storypoints.md`

## Architecture Boundaries
Monorepo layout:
- `apps/api` -> NestJS orchestrator (auth, profile/document pipeline, career profile generation, matching, notebook orchestration)
- `apps/worker` -> scraping/external ingestion worker (Playwright + queue)
- `apps/web` -> Next.js frontend (feature-based structure)
- `packages/db` -> Drizzle schema, migrations, seeds
- `packages/ui` -> shared UI primitives

Boundary rules:
- API owns user-facing business orchestration and persistence of user domain data.
- Worker focuses on scraping/ingestion execution and callback delivery.
- Web contains no business logic duplication that belongs to API.
- DB schema changes must be migration-driven and reflected in seeds/tests when needed.

## Engineering Principles
Always optimize for:
- SOLID
- DRY
- KISS

Code quality rules:
- Keep modules focused and small.
- Prefer explicit DTOs, schemas, and typed contracts.
- Avoid hidden coupling between API and worker internals.
- Favor deterministic logic for critical decisions (matching filters, constraints, run states).
- Keep feature-based folders in frontend (`api/ui/model` split where applicable).

## Delivery Workflow
For each implementation task:
1. Confirm scope from README/roadmap/storypoints.
2. Implement minimal complete slice end-to-end.
3. Add/update tests near changed logic.
4. Run relevant checks.
5. Update docs when behavior/contract changes.

Do not:
- Introduce speculative abstractions without immediate use.
- Mix unrelated refactors into feature/fix changes.
- Change API contracts silently.

## Testing Policy
Baseline checks before considering task done:
- Targeted tests for changed modules.
- `pnpm smoke:e2e` for cross-service validation when flows are affected.

When changing specific areas:
- API logic/DTO/contracts -> update unit/integration tests and smoke assertions if endpoint behavior changes.
- Worker scraping/parsing/filtering -> add or update worker integration/unit tests (including edge cases).
- DB schema -> migration + seed compatibility + affected service tests.
- Web flows -> typecheck/tests and verify API integration paths.

## API and Data Contract Rules
- Keep request/response DTOs explicit and version-friendly.
- Validate and sanitize incoming filters/inputs.
- Preserve idempotency for callbacks/background completion endpoints.
- For matching/profile generation, prefer strict schemas with deterministic post-validation.

## Security and Ops Guardrails
- Protect private endpoints with auth.
- Keep rate limits on sensitive auth endpoints.
- Do not log secrets/tokens/PII unnecessarily.
- Keep CORS explicit via environment config.
- Respect run lifecycle observability (`PENDING/RUNNING/COMPLETED/FAILED`) and failure taxonomy.

## Frontend Rules
- Keep frontend modular and feature-oriented.
- Use shared UI primitives (`@repo/ui`, shadcn-style approach) instead of ad-hoc duplicated components.
- Keep test/support tooling separated from production UX when needed.
- Use env-driven API base URLs; no hardcoded prod/dev URLs.

## Commit and PR Discipline
Commit style:
- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `test: ...`
- `docs: ...`

Rules:
- Small, logically scoped commits.
- One concern per commit.
- Include migrations/tests/docs in the same logical commit when tied to behavior.

## Definition of Done
A task is done when:
- Implementation is complete and coherent across touched apps/packages.
- Tests/checks for changed behavior pass.
- Smoke flow is updated and passing when e2e behavior changed.
- Docs are updated for contract/flow/runbook changes.
- No temporary/debug artifacts remain.

## Planning Guidance
When asked for "next steps" or a plan:
- Propose 4-8 logical, production-relevant increments.
- Prioritize maintainability, scalability, efficiency, and security.
- Keep sequence practical for current milestone state in `storypoints.md`.

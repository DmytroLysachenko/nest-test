# Documentation Standards

Last updated: 2026-03-30

## Purpose

These rules keep repository documentation clear, structured, and useful for both humans and LLM agents.

## Documentation philosophy

Docs are not a copy of the project.

Docs exist to support project understanding by explaining:

1. purpose
2. ownership
3. workflow
4. boundaries
5. decisions
6. where to look in code

Docs should not try to replace:

1. source code
2. schema definitions
3. API implementation details that are already clearer in code

## Core rules

1. Every active document must live in a numbered folder under `docs/`.
2. Every active document filename must start with an in-folder sequence number such as `01_`, `02_`, `03_`.
3. Do not add new root-level files directly under `docs/`.
4. If a document is superseded but still worth keeping, move it to `docs/99_archive_legacy/`.
5. Avoid duplicate active docs covering the same responsibility.
6. Keep docs informative, but not heavy.

## Writing rules

1. Start each doc with:
   - title
   - `Last updated: YYYY-MM-DD`
   - short purpose section when helpful
2. Keep one document responsible for one topic.
3. Prefer explicit sections over long mixed-purpose narrative.
4. Use stable terminology that matches the codebase:
   - `job_offers`
   - `user_job_offers`
   - `job_source_runs`
   - `companies`
5. When a doc makes architectural or workflow claims, name the code areas it refers to.
6. Prefer concise explanation over exhaustive description.
7. Explain what matters, then link or reference the code area instead of restating implementation line by line.
8. Avoid low-signal repetition across docs.

## What good docs should contain

Good docs should usually answer:

1. What is this for?
2. Why does it exist?
3. What does it own?
4. What does it depend on?
5. Where is it implemented?
6. Which other docs should be read next?

## What docs should avoid

Avoid:

1. code snippets
2. large config dumps
3. schema copies that duplicate Drizzle definitions
4. endpoint-by-endpoint restatements when the code or Swagger is already the better source
5. long changelog-style noise inside feature docs

Rule:

- use references to code files and docs
- do not paste implementation into docs unless there is no clearer alternative

## File-reference rules

Docs should include repo-relative path references whenever they help the reader find the implementation.

Examples:

- `apps/api/src/features/job-sources`
- `apps/worker/src/sources/pracuj-pl`
- `packages/db/src/schema/job-offers.ts`

Add file references especially when:

1. a document explains a workflow implemented in code
2. a schema or contract is discussed
3. a doc is the primary owner for a subsystem
4. a migration plan affects a concrete package or feature area

Do not include code snippets for those references.

Prefer:

- `apps/api/src/features/job-sources`
- `packages/db/src/schema/job-offers.ts`

Instead of:

- copied code blocks from those files

## Ownership rules

1. Product plans belong in `docs/03_plans_and_roadmaps/` or `docs/02_product_workflows/`.
2. Architecture and data-model docs belong in `docs/04_architecture_and_data/`.
3. Runtime and deploy docs belong in `docs/05_operations_and_deployment/`.
4. Coding conventions belong in `docs/06_engineering_standards/`.
5. Meta-documentation rules belong in `docs/00_documentation_system/`.

Feature docs should stay feature-first, not app-first.

If a feature spans API, worker, web, and DB:

1. keep one feature doc
2. describe each layer's responsibility briefly
3. reference the relevant code paths

## Update rules

Update docs in the same change whenever:

1. an API contract changes
2. a workflow changes materially
3. a schema changes
4. a deployment procedure changes
5. an ownership boundary changes
6. a roadmap priority changes materially

## LLM-friendly structure rules

1. Put key conclusions near the top.
2. Use deterministic section names.
3. Prefer bullets and numbered lists for plans and rules.
4. Avoid hiding critical assumptions in long paragraphs.
5. State whether the document describes:
   - current reality
   - planned future state
   - historical context
   - deprecated behavior
6. Keep docs skimmable; readers should understand the point without reading every line.

## Archive rules

Move a doc to `docs/99_archive_legacy/` when:

1. a newer doc fully replaces it
2. the content is mostly historical
3. keeping it active would create ambiguity

When archiving:

1. rename it clearly as legacy if needed
2. add a short note at the top saying what replaced it
3. update links from active docs

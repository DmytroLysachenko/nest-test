# Opportunities And Dashboard Feature

Last updated: 2026-05-12

## Purpose

This feature provides the user-facing orientation layer for the product.

It helps the user understand:

1. current workspace readiness
2. what needs attention now
3. which new opportunities should be reviewed
4. where to continue active application work

## User value

It reduces confusion by turning system state into actionable next steps.

## Scope

Includes workspace summary, dashboard summary cards, next-action guidance, discovery entry points, and readiness messaging.

Does not own detailed notebook state transitions, scrape execution internals, or extraction internals.

## Route ownership

`Home` is the fast direction page.

It should own:

- what changed
- what needs attention next
- where the user should go now

It should not own:

- detailed progress history
- full active-application workflow
- profile editing
- deep automation control

`Progress` is the momentum and history page.

It should own:

- recent workspace movement
- changes across setup, updates, and application flow
- a historical read on whether the search is moving forward

It should not own:

- the main next-action decision
- full readiness and blocker summaries repeated from `Home` or `Profile`
- automation controls

`Opportunities` is the first-pass review page.

It should own:

- fresh-role review
- discovery filters and review modes
- keep vs dismiss decisions

It should not own:

- long-lived application management
- general workspace summary beyond what supports review

## Main workflow

1. API aggregates workspace, notebook, document, and scrape state.
2. Frontend surfaces summary and next actions.
3. User moves into discovery or active-work flows.

## Responsibilities

- API:
  - aggregated workspace and summary read models
- Web:
  - dashboard presentation, routing, readiness messaging
- DB:
  - source data consumed by summaries

## Code areas

- `apps/api/src/features/workspace`
- `apps/api/src/features/job-offers`
- `apps/web/src/features/workspace`
- `apps/web/src/features/job-offers`

## Data model

Primary data inputs: `user_job_offers`, `job_offers`, `job_source_runs`, and document/profile readiness data.

## APIs/events

Representative endpoints include `/api/workspace/summary` and `/api/job-offers/summary`.

Current routing/read-model additions:

- dashboard action-plan buckets now carry explicit priority and rationale metadata
- dashboard focus lanes now expose richer active-work slices such as due-today and prep-next
- opportunities and notebook empty states now consume API-driven collection-state guidance so hidden/degraded queues are explained instead of shown as generic empties
- dashboard is now being tightened toward direction-only ownership so repeated readiness and blocker furniture can move out of the home route
- progress is now being tightened toward momentum/history ownership so it stops duplicating the dashboard command role
- opportunities bootstrapping and gating copy now stays specific to discovery/review instead of describing the route as a generic readiness checkpoint
- planning and progress route blockers now resolve against their own route ownership instead of reusing notebook-targeted fallback routing
- opportunities now default to `approx` review mode so first-pass discovery does not begin from the narrowest strict-fit slice unless the user explicitly chooses it
- review actions are expected to reconcile discovery counters and queue grouping immediately, so “saved to pipeline” reflects as workflow movement instead of a delayed background refresh

## Dependencies

Depends on auth, notebook, scrape, documents, and career profile state.

Used by dashboard entry flow, opportunities routing, and recovery UX.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/06_engineering_standards/01_frontend_standards.md`

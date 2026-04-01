# Auth Feature

Last updated: 2026-03-30

## Purpose

This feature owns user authentication and the base identity entry into the product.

## User value

It lets the user sign in, restore a session, and access private product surfaces.

## Scope

Includes login, token issuance, refresh-token rotation, Google OAuth entry, and private-route access prerequisites.

Does not own onboarding content, profile semantics, or notebook workflow.

## Main workflow

1. User starts sign-in.
2. API validates identity and issues tokens.
3. Web app restores auth state and unlocks private routes.
4. User enters onboarding, dashboard, or other private workflow.

## Responsibilities

- API:
  - token issuance, validation, OAuth handling
- Web:
  - auth state hydration and route gating
- DB:
  - user identity persistence

## Code areas

- `apps/api/src/features/auth`
- `apps/web/src/app`
- `apps/web/src/shared/lib`

## Data model

Primary data area: `users`

## APIs/events

Representative endpoints live under `apps/api/src/features/auth`, including `/api/auth/oauth/google`.

## Dependencies

Depends on user identity, token services, and frontend route protection.

Used by all private product features.

## Related docs

- `README.md`
- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`

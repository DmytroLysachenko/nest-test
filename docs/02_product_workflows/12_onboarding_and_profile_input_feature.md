# Onboarding And Profile Input Feature

Last updated: 2026-03-30

## Purpose

This feature helps the user define search intent and become ready for later profile generation, scraping, and notebook workflow.

## User value

It gives the app enough structured user intent to produce relevant outcomes later.

## Scope

Includes onboarding flow, profile input capture, and readiness-related setup state.

Does not own final career profile generation, notebook workflow, or scrape execution.

## Main workflow

1. User enters onboarding.
2. User provides search preferences and profile input.
3. API stores draft or persisted profile input state.
4. Later features consume that input for profile generation, matching, and acquisition.

## Responsibilities

- API:
  - onboarding/profile-input persistence and validation
- Web:
  - onboarding flow and setup UX
- DB:
  - profile input and related readiness state

## Code areas

- `apps/api/src/features/profile-inputs`
- `apps/web/src/app`
- `apps/web/src/features`

## Data model

Primary data areas: onboarding and profile-input persistence plus readiness-related state.

## APIs/events

Representative endpoints live under `apps/api/src/features/profile-inputs`.

## Dependencies

Depends on auth.

Used by documents, career profile generation, matching, scrape intent, and workspace readiness.

## Related docs

- `docs/01_project_context/00_product_and_system_overview.md`
- `docs/01_project_context/02_project_state.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/02_product_workflows/50_career_profile_and_matching_feature.md`

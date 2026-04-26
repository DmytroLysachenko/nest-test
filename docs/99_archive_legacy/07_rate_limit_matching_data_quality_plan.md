# Rate Limit, Matching, And Data Quality Plan

Archived as completed: 2026-04-26

## Context

This plan continues the existing scrape reliability work by simplifying API rate limits and improving deterministic job
matching. The matching path must stay programming-logic based: scraped offers are normalized into structured facts, and
the matcher scores those facts against the canonical career profile without sending every offer through AI.

## Current Findings

The API currently exposes too many throttle variables for the same operational concern. Global API throttling is
configured separately from login, refresh, register, and OTP throttles, while some expensive endpoints still hardcode
inline throttle numbers. This makes deployment configuration noisy and makes endpoint behavior harder to reason about.

The exported DB snapshot in `.tmp/current-db-data` shows the matching chain needs better normalized inputs:

- `job_categories.csv` is empty and exported offers have no category assignment.
- `job_matches.csv` contains only non-matches in the inspected sample, with scores clustered below `40`.
- many offers have no structured salary; missing salary currently risks acting like a hard mismatch.
- taxonomy tables contain noisy or composite values such as mixed contract labels and duplicated work-mode wording.
- duplicate-looking title/company groups exist and need identity/content-hash audit before any destructive cleanup.
- requirements are often empty, so the matcher must rely more on title, normalized relations, details, and technologies.

## Target Design

Rate limits should use a small grouped env surface:

- read/default API requests
- write API requests
- auth requests
- sensitive/expensive requests

Each endpoint still gets its own bucket because Nest throttler keys include the route context, but the budgets are driven
by grouped env values rather than one env variable per endpoint.

Job matching should prefer structured offer facts in this order:

1. normalized many-to-many relations and scalar catalog IDs;
2. numeric salary fields;
3. title and source details;
4. raw description text fallback.

Unknown information should reduce confidence or create soft gaps. It should not become a hard blocker unless the offer
explicitly conflicts with a candidate hard constraint.

## Delivered Utilities

- `pnpm --filter @repo/db audit:matching-data-quality` prints a JSON summary of matching data quality.
- `pnpm --filter @repo/db repair:taxonomy-dimensions` prints known noisy taxonomy rows in dry-run mode.
- `APPLY_CHANGES=true pnpm --filter @repo/db repair:taxonomy-dimensions` rewrites known noisy taxonomy references to
  canonical rows after review.

## Implementation Commits

1. Group throttle env configuration under read, write, auth, and sensitive budgets.
2. Replace inline throttles with shared throttle decorators.
3. Add tests for grouped throttle policy and env validation.
4. Update operations docs with the simplified env matrix.
5. Canonicalize noisy taxonomy values before they reach dimension tables.
6. Add a dry-run capable taxonomy repair utility for existing data.
7. Prefer structured offer facts in the deterministic matcher.
8. Treat unknown salary and ambiguous seniority as soft evidence instead of hard blockers.
9. Add deterministic competency aliases for common technology names.
10. Add repeatable matching data-quality audit output for future reviews.

## Non-Goals

- Do not remove tables or columns in this slice.
- Do not introduce per-offer AI parsing for matching.
- Do not delete duplicate offers until identity, URL, and content-hash behavior are audited.

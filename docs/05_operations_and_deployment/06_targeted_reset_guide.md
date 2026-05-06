# Targeted Reset Guide

Last updated: 2026-05-06

## Purpose

This guide is the operator-facing playbook for safely resetting test-user data without dropping the full schema.

Use it together with:

1. `docs/03_plans_and_roadmaps/05_db_reset_readiness_audit_plan.md`
2. `docs/05_operations_and_deployment/01_runbook.md`

## Available Scripts

Core scripts:

1. `pnpm --filter @repo/db audit:reset-readiness`
2. `pnpm --filter @repo/db reset:test-data`
3. `pnpm --filter @repo/db reset:test-bundle`

What they do:

1. `audit:reset-readiness`
   - checks schema, offer integrity, schedule state, user-link integrity, and workflow evidence
2. `reset:test-data`
   - previews or applies scoped cleanup for explicit target users
3. `reset:test-bundle`
   - runs the operator sequence as one JSON bundle:
   - pre-reset audit
   - reset preview or reset apply
   - optional post-reset audit

## Safety Model

The reset tooling is intentionally conservative.

Rules:

1. no wildcard or all-users mode exists
2. targets must be provided with `RESET_USER_IDS` and/or `RESET_USER_EMAILS`
3. cleanup is preview-only by default
4. apply mode requires both:
   - `APPLY_CHANGES=true`
   - `RESET_CONFIRM=RESET_TEST_DATA`
5. shared offers are only deleted when scope explicitly allows it
6. shared offers are preserved if they are still protected by non-target usage or observation history

## Scope Flags

### Required target flags

1. `RESET_USER_EMAILS=user1@example.com,user2@example.com`
2. or `RESET_USER_IDS=<uuid1>,<uuid2>`

### Cleanup scope

1. `RESET_SCOPE=user-only`
   - clears notebook/run/schedule/user workflow state for target users
   - keeps shared `job_offers`
2. `RESET_SCOPE=user-and-shared-offers`
   - does `user-only`
   - also deletes safe target-linked shared offers

### Optional deeper restart

1. `RESET_INCLUDE_PROFILE_WORKFLOW=true`
   - also deletes:
   - `profile_inputs`
   - cascaded `career_profiles`
   - `documents`
   - `notebook_preferences`
   - `onboarding_drafts`

### Audit flags

1. `RESET_VERIFY_PHASE=pre-reset|post-reset`
2. `RESET_VERIFY_WINDOW_HOURS=72`
3. `RESET_VERIFY_MIN_CATEGORY_COVERAGE=0.8`
4. `RESET_VERIFY_STRICT=true`

### Bundle-only flags

1. `RESET_BUNDLE_RUN_POST_AUDIT=true|false`
2. `RESET_BUNDLE_STRICT_POST_AUDIT=true|false`

## Recommended Operator Flow

### 1. Preview the reset

Example:

```powershell
RESET_USER_EMAILS=test1@example.com,test2@example.com pnpm --filter @repo/db reset:test-data
```

Review:

1. target users
2. target runs
3. target linked offers
4. deletable shared offers
5. preserved shared offers
6. whether profile workflow rows are included

### 2. Run the pre-reset audit

```powershell
pnpm --filter @repo/db audit:reset-readiness
```

Review:

1. active expired offers
2. stale null-expiry offers
3. schedule terminal state
4. orphan or duplicate `user_job_offers`
5. recent manual/direct and scheduled run evidence

### 3. Use the bundle preview if you want one combined artifact

```powershell
RESET_USER_EMAILS=test1@example.com pnpm --filter @repo/db reset:test-bundle
```

This returns one JSON payload containing:

1. `preResetAudit`
2. reset preview output
3. bundle options

### 4. Apply the targeted reset

```powershell
RESET_USER_EMAILS=test1@example.com `
APPLY_CHANGES=true `
RESET_CONFIRM=RESET_TEST_DATA `
pnpm --filter @repo/db reset:test-data
```

### 5. Rebuild the baseline

Run after cleanup:

1. one manual scrape
2. one scheduled scrape
3. one intentional failure-path verification if needed

### 6. Run the post-reset audit

```powershell
RESET_VERIFY_PHASE=post-reset pnpm --filter @repo/db audit:reset-readiness
```

Pass condition:

1. recent manual/direct completed run exists
2. recent scheduled completed run exists
3. no active expired offers remain visible
4. no stale null-expiry active offers remain beyond policy
5. no orphaned or duplicate user links remain

### 7. Use the bundle in apply mode if you want one before/after artifact

```powershell
RESET_USER_EMAILS=test1@example.com `
APPLY_CHANGES=true `
RESET_CONFIRM=RESET_TEST_DATA `
RESET_BUNDLE_RUN_POST_AUDIT=true `
RESET_BUNDLE_STRICT_POST_AUDIT=true `
pnpm --filter @repo/db reset:test-bundle
```

This returns:

1. `preResetAudit`
2. reset apply result
3. `postResetAudit`

And exits non-zero if post-reset hard failure remains.

## When To Use Each Script

Use `reset:test-data` when:

1. you want direct control over preview or apply
2. you only need cleanup output

Use `audit:reset-readiness` when:

1. you want environment health only
2. you want to re-check after manual/scheduled scrape validation

Use `reset:test-bundle` when:

1. you want one operator artifact for review
2. you want pre/post audit wrapped around cleanup
3. you want strict post-reset failure detection in one command

## Do Not Do

1. do not use full-schema drop for test-user cleanup
2. do not apply cleanup before previewing affected rows
3. do not run apply mode without target-user flags
4. do not treat a `COMPLETED` run alone as reset success
5. do not sign off reset without post-reset audit evidence

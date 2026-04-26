# Scrape Reliability And Catalog Audit Plan

Archived as completed: 2026-04-26

Last updated: 2026-04-08

## Purpose

This plan drives the current implementation wave for:

1. production scrape reliability
2. scheduler traceability
3. catalog taxonomy cleanup without premature schema collapse

## Decisions

- Reliability fixes come before schema reduction.
- `job_offers` remains the canonical offer row.
- `job_offer_source_observations` and `job_offer_raw_payloads` remain first-class forensic tables.
- `companies`, `company_aliases`, and `company_source_profiles` stay, but alias/profile writes should only persist additive information.
- `employment_types` and `work_schedules` are distinct dimensions and must not be inferred from each other implicitly.

## Current implementation focus

- make scheduled scrape attempts leave deterministic audit state on both success and failure
- reduce stale-run ambiguity between worker-start failure, heartbeat loss, and callback loss
- split combined multi-value source strings before taxonomy canonicalization
- keep Polish source labels readable while still generating stable canonical slugs
- add read-only audit tooling for redundant aliases, suspicious contract taxonomy rows, schedule failures, and category coverage gaps

## Operational entry points

- `pnpm --filter @repo/db audit:scrape-catalog`
- `pnpm support:query --query-id recent-schedule-failures`
- `pnpm support:query --query-id redundant-company-aliases`
- `pnpm support:query --query-id suspicious-contract-taxonomy`
- `pnpm support:query --query-id empty-job-categories`

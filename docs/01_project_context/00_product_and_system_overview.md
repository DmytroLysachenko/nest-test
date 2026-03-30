# Product And System Overview

Last updated: 2026-03-30

## Purpose

This document explains what the app is for, how the repository is structured, and how the main workflow works across the system.

Use this as the first project-context document after `README.md`.

## What this app is

This project is a job-search operating system, not a generic scraped job board.

Its purpose is to help a user:

1. define their search intent
2. upload and extract career documents
3. generate a structured career profile
4. collect relevant job offers
5. rank and triage those offers
6. manage follow-up and application workflow in one notebook

The product value is meant to come from:

- profile-aware ranking
- cross-source workflow continuity
- notebook and pipeline management
- recovery and supportable automation
- durable memory of offers and applications

Scraping is only one acquisition layer inside that broader workflow.

## Product outcome

The app should reduce user decision time during a job search.

It should help the user answer:

- Which opportunities are worth attention now?
- Which offers match my real profile?
- Which applications are active, stale, or blocked?
- What did this job require when I applied?
- What should I do next?

## Repository structure

Main code areas:

- `apps/api`
  - NestJS orchestrator
  - owns auth, onboarding, documents, career profile generation, matching, notebook read/write flows, scrape orchestration, ops/support APIs
- `apps/worker`
  - scraping and ingestion worker
  - owns source adapters, crawling, parsing, normalization, and callback delivery to API
- `apps/web`
  - Next.js frontend
  - owns dashboard, notebook, opportunities, onboarding, and support-facing UI surfaces
- `packages/db`
  - Drizzle schema, migrations, seeds
  - owns core database contracts
- `packages/ui`
  - shared UI primitives

## Core data model

Key tables and concepts:

- `job_source_runs`
  - one scrape/run execution context
  - tied to user intent and scrape lifecycle
- `job_offers`
  - shared offer catalog
  - canonical store for scraped and reused offers
- `user_job_offers`
  - user-specific connection to a catalog offer
  - stores workflow status, ranking metadata, notes, follow-up state, and prep-related data

This means the app already separates:

1. shared catalog data
2. user workflow data
3. execution history

That separation is important for reuse, rematch, future company modeling, and later multi-source support.

## High-level workflow

### 1. User setup

The user:

1. signs in
2. completes onboarding
3. fills profile input
4. uploads CV/documents

Main code areas:

- `apps/api/src/features/auth`
- `apps/api/src/features/profile-inputs`
- `apps/api/src/features/documents`
- `apps/web/src/app`
- `apps/web/src/features`

### 2. Career profile generation

The API:

1. extracts usable information from uploaded docs
2. generates a canonical career profile
3. validates it with strict schema rules

Main code areas:

- `apps/api/src/features/career-profiles`
- `apps/api/src/common/modules/gemini`

### 3. Opportunity acquisition

The API then decides between:

1. rematching against existing catalog offers
2. enqueueing a fresh scrape run

The worker:

1. fetches listing pages
2. parses offer details
3. normalizes source data
4. sends results back to the API

Main code areas:

- `apps/api/src/features/job-sources`
- `apps/worker/src/jobs`
- `apps/worker/src/sources/pracuj-pl`

### 4. Catalog persistence and user linkage

The API:

1. upserts catalog offers into `job_offers`
2. matches them against the user profile
3. creates or updates `user_job_offers`

This is where acquisition becomes notebook-ready workflow data.

Main code areas:

- `apps/api/src/features/job-sources/job-sources.service.ts`
- `apps/api/src/features/job-offers/job-offers.service.ts`
- `packages/db/src/schema/job-offers.ts`
- `packages/db/src/schema/user-job-offers.ts`

### 5. User triage and pipeline

The frontend exposes:

1. dashboard context
2. opportunities/discovery queue
3. notebook and active pipeline views
4. follow-up and next-step information

Main code areas:

- `apps/web/src/features/workspace`
- `apps/web/src/features/job-offers`

### 6. Support and operations

The system also includes:

1. scrape lifecycle diagnostics
2. callback event visibility
3. run reconciliation and retry tooling
4. support-facing forensic and export surfaces

Main code areas:

- `apps/api/src/features/ops`
- `apps/api/src/features/job-sources`
- `apps/worker/src/db`

## Current product direction

The current direction is:

1. improve workflow quality, not just listing count
2. strengthen the shared catalog
3. enrich offer data so the app remembers more for the user
4. evolve toward company-aware and history-aware job tracking
5. expand to more sources only after the data model is stronger

## What this app is not

It should not become:

1. a weak clone of existing job boards
2. a multi-source mirror with poor workflow value
3. a scraper-heavy system without durable user-facing outcomes

## Related docs

For current state:

- `docs/01_project_context/02_project_state.md`

For future planning:

- `docs/03_plans_and_roadmaps/01_roadmap.md`
- `docs/03_plans_and_roadmaps/02_sprint_plan.md`
- `docs/03_plans_and_roadmaps/03_year_plan.md`

For architecture and data decisions:

- `docs/04_architecture_and_data/01_decisions.md`
- `docs/04_architecture_and_data/02_pracuj_query_mapping.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`

For runtime operations:

- `docs/05_operations_and_deployment/01_runbook.md`
- `docs/05_operations_and_deployment/02_e2e_debugging.md`

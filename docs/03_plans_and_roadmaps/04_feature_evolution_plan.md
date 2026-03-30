# Feature Evolution Plan

Last updated: 2026-03-30

## Purpose

This document captures the near-term feature and product evolution direction discussed in the 2026-03-30 documentation/planning session.

It is intentionally more concrete than the main roadmap and focused on how feature areas should mature together.

## Main direction

The product should evolve by strengthening workflow quality and data quality before expanding source count aggressively.

The guiding sequence is:

1. make current acquisition and notebook workflows more durable
2. enrich the shared catalog
3. introduce company-aware modeling
4. preserve historical offer memory
5. ship user-facing value from that richer model
6. only then add another source

## Priority order

### 1. Pracuj hardening before multi-source expansion

Priority:

- keep improving Pracuj output usefulness
- make extracted fields richer and more normalized
- treat source expansion as a later multiplier, not the next default move

Why:

- current product leverage still comes more from workflow quality than source count
- the shared catalog and notebook model should be stronger before adding more parser and dedupe complexity

### 2. Feature-level documentation maturity

Priority:

- every major feature should have one owning doc
- docs should state purpose, workflow, code areas, and data model

Why:

- this reduces ambiguity for both human contributors and LLM agents
- it keeps business logic mentally bundled even when code spans API, worker, web, and DB

### 3. Company-aware product model

Priority:

- add `companies`
- add `company_aliases`
- connect `job_offers` to company entities
- keep raw source snapshots during transition

Why:

- this unlocks richer user-facing intelligence and future cross-source dedupe

### 4. Offer-memory and historical retention

Priority:

- preserve enough of each offer that users can recall what they applied to weeks later
- introduce offer snapshots for meaningful content changes

Why:

- this is a real user pain point
- it creates defensible workflow value beyond simple listing display

### 5. Feature progression by domain

#### Auth

Direction:

- keep secure and minimal
- avoid feature creep into non-identity concerns

#### Documents and extraction

Direction:

- improve reliability and diagnostics
- ensure extracted data is clean enough to support strong profile generation

#### Career profile and matching

Direction:

- improve deterministic trust and explanation quality
- keep ranking understandable

#### Scrape

Direction:

- strengthen acquisition breadth and data quality
- keep observability high
- evolve toward richer normalized offer data

#### Notebook and opportunities

Direction:

- become the core product moat
- better queues, follow-up reliability, and durable application memory

#### Support and ops

Direction:

- maintain support-grade visibility as more complex data models and sources are introduced

## Recommended implementation sequence

### Phase A: documentation and ownership clarity

1. finish feature docs
2. maintain code-to-doc ownership map
3. keep implementation-history index updated for major shifts

### Phase B: catalog enrichment

1. audit Pracuj payload coverage
2. promote high-value offer fields into normalized columns
3. define source-specific vs canonical offer fields

### Phase C: company-domain rollout

1. create `companies`
2. create `company_aliases`
3. add `job_offers.company_id`
4. backfill conservatively

### Phase D: offer-memory rollout

1. preserve snapshot-worthy offer data
2. create historical offer view for saved/applied opportunities
3. connect notebook UX to those preserved snapshots

### Phase E: company-aware UX

1. company card
2. known locations
3. related openings
4. application history context by company

### Phase F: source-2 readiness review

1. validate catalog and company model strength
2. validate dedupe readiness
3. validate support/debug readiness
4. only then decide on the next source

## Success criteria

This direction is working if:

1. each major feature has one clear owning doc
2. docs and code ownership are easier to navigate
3. the app remembers more about each opportunity
4. company-aware value becomes visible in the product
5. the next-source decision becomes a strategic choice, not a reflex

## Related docs

- `docs/00_documentation_system/00_docs_index.md`
- `docs/00_documentation_system/02_implementation_history.md`
- `docs/02_product_workflows/01_scrape_catalog_evolution_plan.md`
- `docs/03_plans_and_roadmaps/01_roadmap.md`

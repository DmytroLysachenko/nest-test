# Scrape Catalog Evolution Plan

Last updated: 2026-04-01

## Executive summary

The app is already moving in the right direction for a durable job-search product.

Today the data model is not "scrape rows per user". It is:

1. `job_offers` as a shared catalog
2. `user_job_offers` as the user-specific connection to that catalog
3. `job_source_runs` as the user-triggered scrape/run history

That means scraped offers are still connected to the user, but indirectly:

- the run belongs to a user
- the offer lives in the shared catalog
- the notebook/pipeline entry belongs to a user and points at that catalog offer

This is the correct base direction.

The next big product step should not be aggressive multi-source expansion yet. The stronger move is:

1. make the Pracuj ingestion and catalog richer
2. promote company data into first-class entities
3. preserve more historical offer detail for user memory and prep
4. only then add another source on top of a cleaner domain model

## Current state and what it means

### What already exists

The repo already has:

- a shared `job_offers` catalog with freshness and quality fields
- a `user_job_offers` table for notebook status, notes, tags, follow-up, and user-specific ranking metadata
- `job_source_runs` with `user_id` and explicit scrape lifecycle
- catalog-rematch logic so the app can reuse previously scraped offers instead of always scraping again
- normalized company and taxonomy references persisted on `job_offers` when confidence is acceptable
- user-facing offer read models that expose additive structured company and taxonomy context
- enqueue responses that explain when catalog rematch or DB reuse was rejected because fresh-candidate minimums were not met

### Answer to "is scrape data still connected to the user?"

Yes.

It is connected in a better way than a naive per-user scrape store:

- `job_source_runs.user_id` ties the scrape intent and execution history to the user
- `user_job_offers.user_id` ties notebook workflow to the user
- `user_job_offers.job_offer_id` links that workflow entry to the shared offer record

So the user relationship is preserved, but the catalog is reusable across users and across later rematches.

### Why this matters

This model is the right prerequisite for:

- multi-source deduplication
- historical reuse
- company intelligence
- richer ranking
- application-memory features

## Product opinion

### Should we add another source now?

Not yet as the main priority.

A second source is useful only after the current source output becomes durable and richly modeled enough that:

1. users trust the notebook
2. the app remembers enough context to help weeks later
3. deduplication and company intelligence have a stable domain model

If we add new sources too early, we will mostly multiply:

- parser maintenance
- dedupe complexity
- source-specific bugs
- support/debug cost
- low-quality catalog rows

without yet strengthening the product moat.

### What should come first?

The next high-value shift is:

1. enrich the catalog from Pracuj
2. introduce `companies`
3. persist more normalized offer detail
4. design cross-source identity rules
5. then onboard the next source against that stronger model

## Recommended target model

### Keep the current separation

Do not collapse back into user-owned offers.

Keep:

- shared catalog data in catalog tables
- user workflow data in `user_job_offers`
- run/execution history in `job_source_runs` and related events

### Add a `companies` domain

Yes, introducing a `companies` table is the correct direction.

The first version should stay pragmatic, not over-modeled.

Suggested `companies` fields:

- `id`
- `canonical_name`
- `normalized_name`
- `primary_source`
- `source_company_key` or source profile URL when available
- `website_url`
- `logo_url`
- `description`
- `hq_location`
- `size_range`
- `industry`
- `is_verified`
- `first_seen_at`
- `last_seen_at`
- `created_at`
- `updated_at`

Suggested supporting tables:

- `company_aliases`
  - alternate names seen in sources
- `company_locations`
  - normalized office or hiring locations
- later, if justified: `company_source_profiles`
  - source-specific profile links and metadata

### Phase-1 standardization decision

The first implementation slice should standardize only the highest-value repeated dimensions:

- `companies`
- `company_aliases`
- `job_categories`
- `employment_types`
- `contract_types`
- `work_modes`

This is intentionally smaller than a full entity graph.

The goal is to unlock better SQL-backed matching and filtering without over-modeling too early.

### Extend `job_offers`

`job_offers` should reference `companies.id`, but keep denormalized snapshots too.

Recommended additions:

- `company_id`
- `source_company_name_raw`
- `source_company_profile_url`
- `source_company_location_raw`
- `work_modes`
- `seniority`
- `contract_types`
- `salary_min`
- `salary_max`
- `salary_currency`
- `salary_period`
- `technologies`
- `responsibilities`
- `benefits`
- `team_info`
- `apply_url`
- `posted_at`
- `scraped_payload_version`

Keep selected snapshot fields even after adding `company_id`, because an offer is a historical artifact and company data changes over time.

### Preserve offer history, not only current state

You are also right that users need durable memory for old applications.

The app should preserve enough offer data that months later the user can still see:

- title
- company
- location/work mode
- description
- requirements
- technologies
- compensation
- application URL
- the version of the posting that existed when they applied

Recommended follow-up tables:

- `job_offer_snapshots`
  - immutable or append-only snapshots of major content changes
- `company_offer_stats`
  - aggregated counters/materialized summaries, built later

Do not start with heavy analytics tables first. Start by preserving raw durable facts.

## Priority recommendation

Suggested order:

1. Finish Pracuj catalog enrichment.
2. Introduce company entities and basic normalization.
3. Preserve richer offer detail and historical snapshots.
4. Add company-aware UI value for the user.
5. Add one new source only after the above stabilizes.

This order creates actual product value instead of only wider ingestion.

## Migration strategy

Treat this as a staged migration, not one giant schema rewrite.

### Phase 1: Inventory and field audit

Goal: document what Pracuj already yields and what is missing.

Tasks:

1. Audit current parser output, normalization output, and persisted `job_offers.details`.
2. Define which fields are:
   - user-visible now
   - required for ranking
   - required for later memory/history
   - required for company intelligence
3. Define source-specific vs normalized fields explicitly.

Deliverables:

- field inventory doc
- target schema proposal
- normalization rules for company identity and location extraction

### Phase 2: Company foundation

Goal: add first-class company entities without breaking the current workflow.

Tasks:

1. Create `companies`.
2. Create `company_aliases`.
3. Add nullable `job_offers.company_id`.
4. Build deterministic company matching rules for Pracuj-only data.
5. Backfill `company_id` for existing offers where confidence is acceptable.
6. Keep `job_offers.company` as the source snapshot during transition.

Rules:

- prefer conservative matching
- never merge companies on weak heuristics alone
- keep raw source name even when a company match exists

### Phase 3: Offer detail enrichment

Goal: make the catalog genuinely useful for later recall and prep.

Tasks:

1. Extend `job_offers` with normalized detail columns.
2. Keep richer raw payload in `details` for debugging and source-specific future use.
3. Extract technologies, work modes, salary ranges, and structured requirement sections more consistently.
4. Decide which fields belong in columns vs JSON.

Recommended rule:

- columns for fields used in filtering, ranking, or product UX
- JSON for source-specific long-tail metadata

### Phase 4: Historical retention

Goal: preserve what the user saw when they applied.

Tasks:

1. Add `job_offer_snapshots`.
2. Save snapshots when important content changes materially.
3. Link `user_job_offers` prep/history views to the relevant offer snapshot or latest stable snapshot.

Why this matters:

- users often lose context after high-volume application periods
- this creates real workflow value that native boards usually do poorly

### Phase 5: User-facing value

Goal: ship product value, not only backend structure.

Possible first surfaces:

1. Company card on offer details:
   - canonical company profile
   - known locations
   - recent roles from that company
2. Offer memory view:
   - what the posting looked like when saved/applied
3. Company-level notebook helpers:
   - "you already applied to this company"
   - "3 related openings from this employer"
4. Search and filtering:
   - by technology
   - by work mode
   - by company

### Phase 6: Next source onboarding

Goal: add another source into a stronger shared model.

Only start this phase when:

1. company matching rules exist
2. offer identity rules are stable
3. richer offer detail columns exist
4. historical snapshot strategy exists
5. current-source quality is trusted

## Risks and controls

### Risk: over-modeling too early

Avoid building a huge CRM-like company domain before the first useful user experience exists.

Control:

- start with one `companies` table and only a small number of support tables

### Risk: bad company merges

Cross-source company identity is hard.

Control:

- keep raw source company fields
- use conservative canonicalization
- introduce review tooling or confidence thresholds later if needed

### Risk: JSON graveyard

If everything goes into `details`, the product cannot query it well.

Control:

- promote frequently-used fields into real columns
- keep JSON only for source-specific residue

### Risk: source expansion before domain maturity

Adding more boards too early will hide data-model problems under volume.

Control:

- make second-source onboarding conditional on catalog-quality milestones

## Proposed milestone plan

### Milestone 1: Pracuj catalog hardening

Scope:

- parser field inventory
- structured detail extraction audit
- target schema finalized

Success criteria:

- we know exactly which fields we trust and persist

### Milestone 2: Company entity rollout

Scope:

- `companies`
- `company_aliases`
- `job_offers.company_id`
- conservative backfill

Success criteria:

- most Pracuj offers map to a company entity without harming current flows

### Milestone 3: Offer memory model

Scope:

- richer normalized `job_offers` fields
- `job_offer_snapshots`
- stable historical capture for applied/saved offers

Success criteria:

- users can revisit old applications with enough detail to prepare or follow up

### Milestone 4: Company-aware UX

Scope:

- company card
- known locations
- related openings
- company-aware notebook signals

Success criteria:

- new data model clearly improves user decisions

### Milestone 5: Source 2 readiness gate

Scope:

- cross-source identity checklist
- source adapter contract
- source selection based on supply and maintainability

Success criteria:

- adding the second source increases product value rather than just volume

## Practical recommendation for the next 2-4 sprints

If prioritizing pragmatically, I would do this:

1. Audit current Pracuj payload richness and define target catalog fields.
2. Add `companies` plus `job_offers.company_id` with conservative backfill.
3. Normalize and persist technologies/work modes/salary/workplace detail better.
4. Add historical offer snapshots for saved/applied jobs.
5. Ship one user-facing company/offer-memory surface.
6. Reassess whether a second source is still the highest-value next step.

## Bottom line

Your instinct is correct:

- yes, scraped data is still connected to the user
- yes, introducing a `companies` entity is the right next architectural step
- yes, preserving richer offer history is valuable and product-relevant

But the priority should be:

1. strengthen the current source and the catalog model
2. ship user value from that richer data
3. only then expand source coverage

That path is much more likely to produce a defensible product than adding more platforms immediately.

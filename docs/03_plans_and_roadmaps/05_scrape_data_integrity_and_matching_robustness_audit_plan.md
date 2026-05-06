# Scrape Data Integrity And Matching Robustness Audit Plan

Last updated: 2026-05-06

## Purpose

This document defines the audit and hardening plan for source-data integrity, catalog persistence trust, and deterministic matching robustness.

The trigger for this plan is not a hypothetical risk. It is a confirmed production-like data-quality issue:

1. company pages are rendering polluted offer compensation text
2. the polluted values are already stored in `job_offers`
3. the current persistence path treats those rows as fully accepted catalog offers
4. matching consumes the same catalog rows, so poor source quality can leak into scoring, notebook links, and user trust

The goal is to make the system robust when source pages are incomplete, noisy, partially structured, or changed by the upstream site.

This plan is based on current code inspection plus live database inspection on 2026-05-06.

## Incident Snapshot

### Confirmed root cause

The primary confirmed defect is in the Pracuj detail parser salary fallback.

Current behavior:

1. the parser first tries structured salary from JSON-LD
2. if structured salary is absent, it falls back to `extractSalaryFromHtml(page.html)`
3. that fallback currently runs regex against `$('body').text()`
4. Pracuj detail pages include recommended-offer and sidebar content in the same body text
5. salary extraction therefore captures other offers from the page and persists them as the current offer salary

Relevant code:

1. [parse.ts](/C:/Users/Asus/Desktop/projects/pet-projects/nest-test/apps/worker/src/sources/pracuj-pl/parse.ts:496)
2. [persist-scrape.ts](/C:/Users/Asus/Desktop/projects/pet-projects/nest-test/apps/worker/src/db/persist-scrape.ts:205)
3. [companies.service.ts](/C:/Users/Asus/Desktop/projects/pet-projects/nest-test/apps/api/src/features/companies/companies.service.ts:115)
4. [company-detail-page.tsx](/C:/Users/Asus/Desktop/projects/pet-projects/nest-test/apps/web/src/features/companies/ui/company-detail-page.tsx:211)

### Confirmed current DB state

Live `PRACUJ_PL` catalog counts:

1. `342` total offers
2. `124` offers with non-null salary
3. `40` offers with obviously polluted salary strings containing markers like `Superoferta`, `Włącz powiadomienie`, or `Podobne oferty`
4. `0` offers with obviously polluted location strings using the same markers
5. `272` offers missing `expires_at`
6. `342` offers missing `job_category_id`
7. `189` offers missing or empty requirements arrays
8. `0` offers with missing descriptions by current coarse placeholder test
9. all `342` offers still have `quality_state = ACCEPTED`

### Confirmed matching state

Current `user_job_offers` state:

1. `988` linked rows total
2. `988` have `match_score`
3. average `match_score` is `14.28`
4. origins are dominated by `SCRAPE`
5. `match_meta.engine` is mostly `catalog-rematch-v1`, with a smaller `hybrid-profile-v1` set and only `8` rows using `deterministic-profile-v1`

This does not prove matching is broken, but it does prove matching quality should be audited alongside parser hardening.

## What Is Actually Broken

### Broken now

1. source fallback salary extraction is too broad and trusts noisy page regions
2. polluted salary strings persist into shared catalog rows
3. accepted/review/rejected quality-state logic does not currently demote these rows
4. company detail UI shows stored salary without a confidence guard
5. catalog persistence can preserve bad salary text across refreshes if new structured salary stays absent

### Not yet proven broken, but at risk

1. detail fallback for description may also over-read page chrome or recommendation content on sparse pages
2. requirement extraction may silently flatten mixed sections and lose distinction between expected, optional, and generic page text
3. title and company fallback may drift if Pracuj page contracts move from current selectors
4. category inference may misclassify broad-content roles because live DB still has `342` missing categories
5. matching may over-score or under-score offers when:
   - salary text is polluted
   - category is missing
   - requirements are sparse
   - technologies are under-extracted
   - work mode or contract data is inferred only from text

## Adjacent Failure Surfaces To Audit

The salary incident is likely one member of a broader class: trusting weak fallback extraction from noisy HTML.

### 1. Parser fallback surfaces

Audit every field that can fall back from trusted structured data to broad HTML text:

1. salary
2. location
3. company
4. title
5. description
6. requirements
7. work mode
8. contract type
9. seniority
10. company profile URL
11. apply URL
12. expiry date

### 2. Persistence trust boundaries

Audit whether low-confidence values are being persisted as if they were reliable:

1. `job_offers.salary`
2. `job_offers.description`
3. `job_offers.requirements`
4. `job_offers.details`
5. `job_offers.quality_state`
6. `job_offers.quality_reason`
7. `job_offer_source_observations.*`

### 3. Read-model trust boundaries

Audit where raw catalog fields are rendered without quality-aware presentation:

1. companies detail page
2. opportunities cards
3. notebook list and details rail
4. support and ops diagnostics views
5. any export/prep packet surfaces

### 4. Matching trust boundaries

Audit where scoring relies on fields that may be absent or noisy:

1. salary constraints and salary preference gaps
2. role/category fit
3. competency fit derived from requirements and details
4. work mode and employment-type hard constraints
5. seniority detection from title/text

## Evidence We Still Need

We have enough evidence to fix the specific salary defect, but not enough to harden the whole source-ingestion contract safely.

### Required sample pack

Build a debugging corpus of at least `10` real Pracuj offers across different shapes:

1. structured salary present
2. salary absent
3. location in JSON-LD only
4. location in visible DOM only
5. rich requirements sections
6. sparse description with fallback path
7. expired offer
8. offer with employer profile
9. offer with recommendation-heavy sidebar noise
10. offer with minimal details and no category-friendly keywords

For each sample, retain:

1. offer URL
2. source id
3. stored `job_offers` row snapshot
4. latest `job_offer_source_observations` snapshot
5. `source-raw` payload JSON
6. parsed normalized job payload
7. if possible, raw HTML artifact or a bounded HTML excerpt around trusted selectors

### Why this sample pack matters

It prevents hardening around one broken example only.

The fix must survive:

1. multilingual offers
2. sparse offers
3. no-salary offers
4. no-expiry offers
5. sidebar-heavy pages
6. different page templates

## What Data We Already Have Versus What Is Missing

### Already available now

1. `job_offer_source_observations` exists for `338` Pracuj offers
2. all `40` obviously polluted salary rows already have `source-raw` JSON payload available
3. `source-raw` payload captures Pracuj `jobOffer` / `jobPosting` JSON content
4. `normalized-job` payload exists for persisted normalization snapshots

### Missing or insufficient now

1. full raw HTML is not stored in `job_offer_raw_payloads`
2. fallback provenance per field is not persisted
3. confidence level per extracted field is not persisted
4. source selector / extraction-path diagnostics are not persisted
5. current quality-state logic is too coarse to demote noisy-but-nonempty values

## Required Hardening Work

### Workstream 1. Introduce field-level extraction confidence

Add explicit extraction provenance and confidence for key fields:

1. salary
2. location
3. title
4. company
5. description
6. requirements
7. expiry

Each field should carry at least:

1. `source = structured | trusted_dom | derived | broad_fallback | unknown`
2. `confidence = high | medium | low`
3. `reasons[]` when degraded

This can live in normalized details and observation payload first before schema expansion if needed.

### Workstream 2. Replace broad HTML fallback with trusted-region fallback

For salary specifically:

1. remove whole-body regex fallback
2. prefer JSON-LD salary
3. else prefer trusted salary selectors only
4. else leave salary `null`
5. never concatenate multiple salary snippets from unrelated DOM regions

The same philosophy should be applied to other fields:

1. no whole-body fallback for salary
2. no whole-body fallback for company
3. no unbounded section scraping for requirements
4. only use bounded, owned, explainable selectors

### Workstream 3. Add parser sanity guards

Before persistence, reject or null fields that look contaminated.

Examples for salary:

1. contains `Superoferta`
2. contains `Podobne oferty`
3. contains `Włącz powiadomienie`
4. contains multiple obvious employer/title chains
5. contains suspicious repeated city/salary pairs

Guard outcomes:

1. field nulled, not persisted
2. quality reason annotated
3. offer may stay accepted if the rest of the row is strong
4. offer moves to `REVIEW` if too many critical fields are low-confidence

### Workstream 4. Strengthen quality-state semantics

Current state is too permissive because polluted rows still land as `ACCEPTED`.

Introduce clearer transitions:

1. `ACCEPTED`
   - trusted enough for catalog and UI
2. `REVIEW`
   - persist row, but mark suspicious and suppress unreliable fields in UI/matching
3. `REJECTED`
   - do not link into notebook/matching paths

Quality reasons should include:

1. `salary_noise`
2. `description_noise`
3. `requirements_noise`
4. `field_confidence_low`
5. `selector_fallback_only`
6. `listing_salvage`
7. `missing_structured_core`

### Workstream 5. Repair polluted historical rows

We need a one-time repair pass, not only forward fixes.

Repair strategy:

1. detect known-bad salary strings by contamination markers and heuristics
2. for rows with usable `source-raw` payload, reparse with fixed parser
3. update catalog rows and latest observation rows with repaired salary/confidence
4. for unrecoverable rows, null salary and mark degraded quality
5. rerun any derived salary-structured fields if reparsed salary becomes trustworthy

### Workstream 6. Make UI quality-aware

UI should not present suspicious fields with the same confidence as clean fields.

Required behavior:

1. if salary is `null`, hide salary chip quietly
2. if salary is low-confidence, either hide it or show a degraded label such as internal support-only warning
3. company and notebook pages must not concatenate unrelated values by presentation logic
4. support views should expose quality reasons directly

### Workstream 7. Audit and harden deterministic matching

Matching should be resilient to missing or suspicious source fields.

Current concerns:

1. average linked score is low
2. category coverage is effectively zero in live Pracuj data
3. salary preference gaps may be over-produced because structured salary is often missing
4. polluted salary text may create false numeric candidates if not guarded

Matching hardening goals:

1. salary should influence matching only when confidence is high enough
2. category fit should degrade gracefully when category is missing
3. missing requirements should reduce evidence, not create false negatives through noisy text
4. low-confidence offers should be eligible for review state rather than silently mixed with strong offers
5. linked-offer insertion thresholds should be revisited if current average linked score remains very low

## Matching Audit Scope

### Questions to answer

1. why are so many linked offers accepted at very low scores
2. whether `SCRAPE` origin intentionally bypasses a stronger score threshold too often
3. whether polluted or sparse fields are depressing valid matches or allowing weak ones
4. whether category absence materially weakens role-fit scoring
5. whether hard salary and work-mode rules are acting on too much unknown data

### Required matching evidence

Pull at least:

1. score distribution by origin
2. score distribution by quality state
3. score distribution by presence/absence of salary, requirements, category, and technologies
4. examples of top `10` low-score linked offers that were still inserted
5. examples of high-quality offers that were not linked

### Expected matching decisions after hardening

1. high-confidence rich offers should score and link deterministically
2. sparse-but-valid offers may still link, but with clear evidence gaps
3. noisy offers should be suppressed or downgraded before matching
4. unknown salary should not act like a hard failure unless product intentionally wants that

## How To Obtain Missing Debug Data

### Immediate path using current system

1. query `job_offers`
2. query `job_offer_source_observations`
3. query `job_offer_raw_payloads`
4. sample polluted and non-polluted rows side by side
5. compare stored row against `source-raw` and `normalized-job`

### Short-term instrumentation to add

1. save bounded field-extraction diagnostics per observation
2. optionally save compressed raw HTML for sampled debug runs only
3. save exact parser branch used for each key field
4. save contamination flags raised during normalization

### Where to store it

Preferred order:

1. `job_offer_raw_payloads.payload_json` for structured parser diagnostics
2. worker artifact output for bounded raw HTML samples
3. support/ops endpoint summaries for field-confidence aggregate counts

## Execution Plan

### Phase 1. Audit and instrumentation

1. collect `10`-offer sample pack
2. add field-level provenance diagnostics
3. add contamination counters to ops/support surfaces
4. measure affected rows beyond salary

### Phase 2. Parser hardening

1. remove whole-body salary fallback
2. replace with trusted-selector fallback only
3. add contamination guards
4. add tests for:
   - salary missing
   - salary structured
   - recommendation-heavy noisy page
   - sparse page
   - multilingual variants

### Phase 3. Persistence and quality-state hardening

1. persist confidence/provenance
2. revise `quality_state` / `quality_reason`
3. prevent low-confidence fields from overwriting trusted historical fields
4. ensure missing optional data becomes `null`, not garbage

### Phase 4. Historical repair

1. build repair query for suspect salaries
2. reparse recoverable rows from stored `source-raw`
3. null unrecoverable salary rows
4. rerun category inference/backfill where needed

### Phase 5. Matching audit and threshold tuning

1. inspect low-score inserted rows
2. validate salary unknown behavior
3. validate category-missing behavior
4. validate sparse requirements behavior
5. adjust score thresholds or insert rules only after evidence review

### Phase 6. Read-model and UI hardening

1. hide or downgrade low-confidence fields
2. expose support diagnostics for suspicious offers
3. verify company, notebook, and opportunities surfaces against repaired rows

## Acceptance Gates

This audit is complete only when all of the following are true:

1. no salary field is produced from whole-body HTML scraping
2. polluted historical salary rows are repaired or safely nulled
3. quality-state logic can distinguish accepted versus review-needed offers
4. at least `10` representative source samples are retained and covered by tests
5. matching behavior is audited with real score-distribution evidence
6. missing optional source fields degrade to `null` or review state, not noisy strings
7. company and notebook UI no longer display contaminated compensation data

## Non-Goals

This plan does not assume:

1. every source will always provide salary
2. every source will always provide expiry
3. every offer must have category before being persisted
4. every sparse offer should be rejected

The target state is not “complete data at all costs”.

The target state is:

1. trustworthy persistence
2. explicit confidence
3. robust fallbacks
4. predictable matching
5. graceful handling of missing data

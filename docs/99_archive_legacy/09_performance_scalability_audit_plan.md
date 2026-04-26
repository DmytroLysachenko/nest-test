# Performance, Scalability, and Structure Audit Plan

Archived as completed: 2026-04-26

## Status

Implemented on `dev` as of 2026-04-24.

Closed in implementation scope:

- workspace summary query-shape reduction and SQL-based follow-up aggregation
- reminder delivery batching/concurrency cleanup
- lightweight job-offer preview/read-model usage for summary surfaces
- stronger server-assisted private-session bootstrap on the web
- reduced private-shell overfetch by moving non-shell data out of the global provider
- development-only React Query devtools loading
- lazy loading for heavier private panels
- bounded worker detail-fetch concurrency
- reduced worker persistence roundtrips
- explicit worker concurrency/backpressure visibility in runtime health and startup logs
- document read-path side-effect removal

Remaining optimization from this point is iterative tuning, not unfinished audit debt.

## Goal

Audit runtime performance and scalability risks across:

- `apps/api`
- `apps/web`
- `apps/worker`

Secondary goal:

- call out structural issues that will make future performance work harder, riskier, or slower to ship

This document focuses on actual code-path risk, not generic framework advice.

---

## Executive Summary

The project is in a workable state for current scope, but several code paths will become expensive quickly as user count, offer volume, and scrape frequency grow.

The main themes are:

1. the API has multiple high-roundtrip background and summary flows
2. the web app is heavily client-bootstrapped and pays a noticeable first-load tax
3. the worker is reliable-first but throughput-capped in key scrape stages
4. several important modules are already too large, which raises the cost of targeted optimization

The biggest performance risks are:

- API summary and reminder delivery query shape
- client-side bootstrap waterfall on private web surfaces
- sequential detail crawling and serial persistence/update loops in the worker
- very large monolithic services in `job-sources`, `job-offers`, `ops`, and large client pages/components in `web`

The product does not appear fundamentally blocked by raw compute. The bigger issue is avoidable latency from:

- too many round trips
- too much client-side bootstrapping
- side effects on read paths
- large orchestration modules doing too many jobs at once

---

## Overall Assessment

## Current Strengths

- shared query abstraction exists on the web
- API already uses targeted caching in some places, such as workspace summary cache
- worker code clearly prioritizes robustness and recoverability
- DB writes are mostly explicit and typed
- there is already good verification coverage through tests and smoke flow

## Current Weaknesses

- high-value endpoints and workflows are still query-heavy
- private web entry is almost entirely client-resolved
- several large services act as performance hot spots and maintenance hot spots at the same time
- batching exists in some areas, but many loops still persist or update row-by-row

---

## API Audit

## 1. Workspace summary is doing too many independent queries and a full follow-up scan

Code:

- `apps/api/src/features/workspace/workspace.service.ts`

### Findings

`computeSummary()` executes many separate DB queries one after another:

- latest profile input
- latest active profile
- offer status counts
- scored offer count
- last offer update
- full follow-up offer set
- document status counts
- run count
- latest run

The heaviest issue is not just query count. It is that follow-up computation loads the full `pipelineMeta` set for all user offers and then derives due-state in application code.

### Why this matters

- summary drives private-page bootstrapping
- every private entry depends on this path
- summary cost grows with offer volume
- the full follow-up scan scales with total user offers, not just needed aggregates

### Risk level

High

### Recommended fix

- parallelize independent queries with `Promise.all`
- move follow-up-due aggregation into SQL or into a dedicated read model
- split “expensive workflow signals” from “always-needed top summary”
- consider a persisted per-user summary/read model refreshed on writes and background events

---

## 2. Reminder delivery pipeline is N+1 and serial in the worst possible place

Code:

- `apps/api/src/features/job-offers/job-offers.service.ts`

### Findings

`deliverReminderDigests()` currently:

- loads all eligible users
- loops users one by one
- calls `getReminderPreview(user.id)` per user
- loads reminder state rows per user
- sends mail
- persists reminder result per offer, one row at a time, in nested loops

This is a classic high-roundtrip background job shape.

### Why this matters

- mail delivery jobs should be throughput-friendly
- cost grows with users and reminder volume
- DB roundtrips scale with each reminder item
- it will become a bottleneck before compute does

### Risk level

High

### Recommended fix

- batch reminder candidate loading by user in SQL
- avoid per-user preview recomputation when a delivery projection can be queried directly
- replace per-item update loops with bulk update/upsert by bucket window
- add bounded concurrency for user-level processing
- isolate reminder candidate selection from reminder transport delivery

---

## 3. Job offer list path is feature-rich but query-heavy

Code:

- `apps/api/src/features/job-offers/job-offers.service.ts`
- `apps/api/src/features/job-offers/job-offers-structured-details.ts`

### Findings

The list path:

- fetches a wide result set
- in strict mode may fetch up to `limit * 3`
- loads five relation tables separately for structured relations
- performs ranking and explanation building in application code
- derives attention and reminder state in-process

This is acceptable for small slices, but it is expensive if default limits increase or if more surfaces begin reusing the same endpoint more aggressively.

### Why this matters

- list endpoints sit on core workflow pages
- every extra per-item transform compounds quickly
- relation loading is batched, but still adds repeated query work to a hot path

### Risk level

Medium to high

### Recommended fix

- create a lighter list projection for discovery/dashboard preview use cases
- separate “details-rich notebook row” from “summary preview row”
- consider precomputing relation aggregates into JSON arrays on ingest/update
- keep strict-mode overfetching bounded and observable

---

## 4. Document read paths trigger orchestration side effects

Code:

- `apps/api/src/features/documents/documents.service.ts`

### Findings

`list()` and `getById()` both iterate through pending uploaded documents and call `ensureExtractionQueued()`.

### Why this matters

- GET requests are not cheap reads anymore
- repeated reads can trigger repeated queue checks/work
- this increases latency unpredictably on a path that should be simple
- it makes profiling and caching harder because reads are not pure reads

### Risk level

Medium

### Recommended fix

- keep queueing responsibility on explicit write/transition endpoints
- only recover stale leases/queue state in a dedicated maintenance path
- if read-triggered repair remains necessary, debounce it behind a separate async repair signal rather than direct per-document checks in the request path

---

## 5. In-memory workspace summary cache helps latency, but not horizontally

Code:

- `apps/api/src/features/workspace/workspace-summary-cache.ts`

### Findings

The workspace summary cache is process-local only.

### Why this matters

- behavior differs across instances
- cache hit rate drops under horizontal scaling
- invalidation is local, not distributed

### Risk level

Medium

### Recommended fix

- keep it for local latency if useful, but do not rely on it as the main scaling answer
- if summary cost remains material, move to either:
  - a persisted read model
  - or distributed cache with explicit invalidation hooks

---

## 6. API structure risk: several services are already too large

Largest files include:

- `apps/api/src/features/job-sources/job-sources.service.ts`
- `apps/api/src/features/job-offers/job-offers.service.ts`
- `apps/api/src/features/ops/ops.service.ts`

### Why this matters

- performance fixes become risky because every change touches a large orchestration surface
- caching and batching opportunities are harder to isolate
- testing hot paths independently becomes harder
- multiple responsibilities get optimized together instead of separately

### Risk level

Medium, rising to high over time

### Recommended fix

Split by runtime responsibility, not by arbitrary helper extraction:

- query/read-model services
- background orchestration services
- scoring/derivation services
- repair/recovery services

---

## Web Audit

## 1. Private web surfaces are heavily client-bootstrapped

Code:

- `apps/web/src/app/(private)/layout.tsx`
- `apps/web/src/features/auth/model/context/auth-context.tsx`
- `apps/web/src/shared/lib/dashboard/private-dashboard-data-context.tsx`

### Findings

Private routing currently works like this:

- hydrate auth token from storage on client
- fetch `/me`
- render splash while auth resolves
- mount private dashboard provider
- fire multiple React Query requests for summary/profile/documents/notebook/schedule
- then page-specific queries begin

Also, most page roots and many layout-level components are marked `'use client'`.

### Why this matters

- slower first meaningful render on every cold private entry
- a “restore workspace” splash hides real work that could be server-resolved
- initial perceived latency increases even when backend latency is reasonable
- bundle size and hydration work are larger than necessary

### Risk level

High

### Recommended fix

- move private-shell auth and essential bootstrap to server components where possible
- reduce client-only scope to interactive islands
- server-resolve session and initial summary payload for private entry
- keep React Query for live mutations and refresh, not as the only bootstrap path

---

## 2. Private bootstrap duplicates some data concerns across provider and pages

Code:

- `apps/web/src/shared/lib/dashboard/private-dashboard-data-context.tsx`
- `apps/web/src/features/workspace/model/hooks/use-workspace-dashboard-data.ts`
- `apps/web/src/features/workspace/model/hooks/use-workspace-dashboard-queries.ts`
- `apps/web/src/features/job-offers/model/hooks/use-notebook-queries.ts`

### Findings

The private provider already loads:

- workspace summary
- latest profile input
- latest career profile
- documents
- notebook summary
- scrape schedule

Then pages add:

- dashboard offers preview
- focus groups
- action plan
- notebook list
- notebook preferences
- reminder preview
- history
- prep packet

The shape is not wrong, but it means the first interactive view often depends on both global bootstrap queries and local page queries.

### Why this matters

- duplicate bootstrapping concerns are easy to drift
- page readiness depends on a mix of provider and local query state
- more network work than necessary on initial page load

### Risk level

Medium to high

### Recommended fix

- define one canonical bootstrap payload for private entry
- separate:
  - always-needed shell data
  - page summary data
  - panel/detail data
- lazy-load detail-only queries after page shell becomes interactive

---

## 3. Too many large client components

Largest frontend files include:

- `apps/web/src/features/job-sources/ui/job-sources-panel.tsx`
- `apps/web/src/features/job-offers/ui/components/notebook-offer-details-card.tsx`
- `apps/web/src/features/workspace/ui/workspace-dashboard-page.tsx`
- `apps/web/src/features/ops/ui/ops-page.tsx`
- `apps/web/src/features/job-offers/ui/components/notebook-offers-list-card.tsx`

### Why this matters

- larger bundles
- more rerender surface
- harder memoization boundaries
- harder to isolate expensive interactions

### Risk level

Medium

### Recommended fix

- split page shells from heavy subpanels
- lazy-load low-frequency panels such as diagnostics, ops blocks, large detail editors
- isolate derived data into selectors/hooks with stable inputs

---

## 4. Private dashboard shell still depends on client auth storage

Code:

- `apps/web/src/features/auth/model/context/auth-context.tsx`
- `apps/web/src/features/auth/model/hooks/use-auth-me-query.ts`

### Findings

The app uses stored tokens in client state as the starting point, then fetches `/me`.

### Why this matters

- private app boot depends on local storage hydration
- redirects and shell availability are delayed until client boot completes
- this can be acceptable for internal tooling, but not ideal for a production workspace UX

### Risk level

Medium

### Recommended fix

- move to server-readable session mechanism for private entry where feasible
- at minimum, preload auth/me state more directly to reduce private-shell loading penalty

---

## 5. React Query devtools are mounted unconditionally

Code:

- `apps/web/src/app/providers.tsx`

### Findings

`ReactQueryDevtools` is rendered directly in `Providers`.

### Why this matters

- can add avoidable client bundle/runtime overhead outside development if not fully excluded

### Risk level

Low to medium

### Recommended fix

- gate devtools behind development-only check or dynamic import in dev only

---

## 6. No major list virtualization problem yet, but watch it

### Findings

Notebook and opportunities slices appear paginated and bounded. This avoids immediate virtualization pressure.

### Why this matters

- current limits keep list rendering reasonable
- however, richer rows and large detail panels already make each item expensive

### Recommendation

- keep pagination bounded
- do not widen default list sizes casually
- if rows become more interactive, move expensive subcontent out of the repeated row tree

---

## Worker Audit

## 1. Detail crawling is mostly sequential and throughput-capped

Code:

- `apps/worker/src/sources/pracuj-pl/crawl.ts`

### Findings

Detail pages are processed in a loop, one target at a time, with deliberate delays and browser fallback handling.

This is good for source safety and determinism, but it hard-caps throughput.

### Why this matters

- scrape duration scales directly with number of detail pages
- horizontal scale helps only if more jobs are scheduled, not within a single run
- large target windows will stretch runtime quickly

### Risk level

High for future scale

### Recommended fix

- keep source-safe behavior, but introduce bounded concurrency for HTTP detail fetches
- retain serialized or lower-concurrency browser fallback path
- make concurrency source-configurable
- expose throughput metrics per stage so tuning is data-driven

---

## 2. Persist flow still performs serial chunk updates after insert/upsert

Code:

- `apps/worker/src/db/persist-scrape.ts`

### Findings

After bulk insert/upsert, the worker still updates `runId` for `jobLinks` in chunked serial loops.

### Why this matters

- more DB roundtrips than necessary
- write completion time grows with result size
- background throughput degrades under larger scrape batches

### Risk level

Medium

### Recommended fix

- revisit whether the follow-up `runId` update is still needed for all URLs
- if needed, batch more aggressively or rework persistence shape so run linkage happens during main upsert path

---

## 3. Worker orchestration is already concentrated in very large modules

Largest files include:

- `apps/worker/src/jobs/scrape-job.ts`
- `apps/worker/src/sources/pracuj-pl/crawl.ts`

### Why this matters

- difficult to optimize one stage without destabilizing others
- harder to parallelize responsibly
- harder to benchmark isolated phases

### Risk level

Medium, rising over time

### Recommended fix

Split by runtime phase:

- task intake / validation
- listing acquisition
- detail acquisition
- normalization
- persistence
- callback emission / diagnostics

---

## 4. Worker startup is simple and fine, but concurrency policy is implicit

Code:

- `apps/worker/src/index.ts`

### Findings

The worker boot path is intentionally small, which is good. The issue is that concurrency/backpressure strategy is not obvious at the entrypoint level and seems distributed through task/run logic.

### Why this matters

- harder to reason about horizontal scaling characteristics
- harder to tune Cloud Run/task concurrency safely

### Risk level

Low to medium

### Recommended fix

- document effective concurrency policy
- make worker-level concurrency limits explicit in config and run diagnostics

---

## Cross-Cutting Findings

## 1. Large modules are now a performance problem, not just a style problem

When hot paths live in 75KB to 230KB files, performance work becomes slower and riskier because:

- ownership boundaries are blurred
- query shape, business logic, and side effects are mixed
- targeted benchmarking is harder

This affects:

- API hot services
- large web workspace pages/components
- worker scrape orchestration

---

## 2. Read-model strategy is underused

A lot of the project’s cost comes from building workflow summaries on demand from base tables:

- workspace summary
- action plan
- reminder preview/delivery state
- rich notebook list state

The product is becoming read-model heavy. That is normal for this domain.

### Recommendation

Invest more in persisted or incrementally refreshed read models for:

- private shell summary
- notebook/action-plan aggregates
- reminder candidate selection
- company summary counts if usage grows

---

## 3. Client/server split on the web needs another pass

The private app behaves more like a client SPA running on Next than a server-assisted Next app.

That is workable, but it leaves performance on the table:

- slower private-page cold starts
- more hydration
- more duplicated query orchestration

---

## Priority Ranking

## Highest Priority

1. Optimize workspace summary path in API
2. Redesign reminder delivery pipeline batching in API
3. Move private web bootstrap toward server-resolved shell data
4. Introduce bounded concurrency for worker detail fetches

## Medium Priority

5. Split heavy list/read-model endpoints into lighter projections
6. Remove read-path side effects in document flows
7. Reduce large client page/component scope in web
8. Break up `job-sources.service.ts`, `job-offers.service.ts`, `scrape-job.ts`

## Lower Priority

9. Gate React Query devtools to development only
10. Revisit worker persistence update shape
11. Formalize worker concurrency/backpressure policy

---

## Proposed Implementation Streams

## Stream A: API query-shape reduction

- parallelize workspace summary queries
- move follow-up due counts to SQL/read model
- create lighter offer list projections
- batch reminder delivery selection and persistence

## Stream B: Web bootstrap and bundle reduction

- server-resolve private auth + shell bootstrap payload
- reduce client-only page roots
- lazy-load low-frequency heavy panels
- remove duplicate first-load queries where provider and page overlap

## Stream C: Worker throughput tuning

- add bounded detail-fetch concurrency
- separate HTTP detail concurrency from browser fallback concurrency
- batch persistence/update work more aggressively
- add stage timing metrics to validate gains

## Stream D: Structural cleanup for long-term performance

- split large orchestration services by runtime responsibility
- split very large UI components by interaction boundary
- define read-model ownership explicitly

---

## Suggested Commit Sequence

1. `refactor: parallelize workspace summary queries and reduce full scans`
2. `feat: batch notebook reminder delivery selection and persistence`
3. `refactor: add lightweight job-offer list projections for summary surfaces`
4. `refactor: move private web shell bootstrap to server-assisted data loading`
5. `refactor: lazy-load heavy dashboard and notebook detail panels`
6. `feat: add bounded worker detail-fetch concurrency controls`
7. `refactor: reduce serial worker persistence updates`
8. `refactor: split hot-path orchestration services by responsibility`

---

## Final Recommendation

The next performance pass should not start with micro-optimizations.

The right order is:

1. reduce roundtrips on summary and background pipelines
2. reduce client bootstrap work on private web entry
3. raise worker throughput with bounded concurrency
4. split oversized modules so future optimization becomes cheaper

If those four things are done well, the app will get faster now and stay easier to scale later.

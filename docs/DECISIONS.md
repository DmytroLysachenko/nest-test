# Decisions

ADR-lite log for major architectural and contract decisions.

## 2026-02-21: Canonical Career Profile Schema

- Decision:
  - Use one strict JSON schema (`schemaVersion: "1.0.0"`) for generated career profiles.
  - Remove temporary dual-read/version-bridge logic before first production release.
- Why:
  - Better consistency for matching and scrape-filter derivation.
  - Less maintenance overhead than parallel schema support.

## 2026-02-21: Write-Through Denormalized Profile Projection

- Decision:
  - Persist selected query-critical profile fields into explicit DB columns in `career_profiles`.
  - Keep `content_json` as full canonical source.
- Why:
  - Faster read/filter use-cases.
  - Simpler and safer FE/read-model queries.
  - Avoid repeated JSON parsing for hot paths.

## 2026-02-21: Search-View Endpoint

- Decision:
  - Add `GET /api/career-profiles/search-view` over denormalized columns.
- Why:
  - Provide stable query API for FE/testing.
  - Enable filterable profile diagnostics (`seniority`, `role`, `keyword`, `technology`).

## 2026-02-21: Scraper Zero-Results and Recommended Offers Handling

- Decision:
  - Exclude `section-recommended-offers` from primary scrape targets.
  - Detect `zero-offers-section` and progressively relax filters to reach target offer count.
- Why:
  - Prevent irrelevant recommendations from polluting scrape results.
  - Maintain useful output when strict filters return zero listings.

## 2026-02-21: Seniority Constraint in Deterministic Matching

- Decision:
  - Treat seniority mismatch (job above candidate primary seniority) as hard constraint violation.
- Why:
  - Avoid low-trust match outcomes (e.g., junior candidates matched to senior-only roles).

## 2026-02-23: Request Payload Guardrails (API + Worker)

- Decision:
  - Add environment-driven request body size limits:
    - API: `API_BODY_LIMIT`
    - Worker: `WORKER_MAX_BODY_BYTES`
- Why:
  - Reduce memory abuse and accidental oversized payload failures.
  - Keep ingress behavior explicit and configurable by environment.

## 2026-02-23: Source-Specific Listing URL Allowlist

- Decision:
  - Validate scrape `listingUrl` host/protocol in API before worker enqueue.
  - For `pracuj-pl*` sources, permit only `pracuj.pl` and subdomains.
- Why:
  - Prevent SSRF-style misuse and accidental scraping of unsupported domains.
  - Keep API-to-worker contract bounded to known source adapters.

## 2026-02-23: Callback Retry Strategy Upgrade

- Decision:
  - Use exponential backoff with jitter and max-delay cap for worker callback retries.
  - Add env controls:
    - `WORKER_CALLBACK_RETRY_MAX_DELAY_MS`
    - `WORKER_CALLBACK_RETRY_JITTER_PCT`
- Why:
  - Lower retry synchronization spikes.
  - Improve callback reliability without unbounded delay growth.

## 2026-02-23: Web E2E Coverage as CI Gate

- Decision:
  - Run full web Playwright e2e suite in CI (not only a single notebook spec).
- Why:
  - Catch cross-page integration regressions early.
  - Keep internal tester and profile management flows continuously validated.

## 2026-02-24: Notebook Ranking Modes

- Decision:
  - Add mode-driven ranking on `GET /job-offers`:
    - `strict` (default): only scored offers without hard-constraint violations.
    - `approx`: broader set with deterministic violation penalties.
    - `explore`: discovery-oriented ordering.
- Why:
  - Improve trust by default while still supporting discovery workflows.
  - Keep ranking behavior explicit and testable.

## 2026-02-24: Deterministic Profile Quality Read Model

- Decision:
  - Add `GET /career-profiles/quality` returning deterministic completeness signals and recommendations.
- Why:
  - Make profile readiness measurable before matching/scraping.
  - Reduce black-box behavior in profile generation flow.

## 2026-02-24: Scrape Run Diagnostics Endpoint

- Decision:
  - Extend worker callback payload with diagnostics and expose run-level diagnostics at
    `GET /job-sources/runs/:id/diagnostics`.
- Why:
  - Improve scrape observability (filter relaxation, blocked pages, link discovery stats).
  - Provide support/debug transparency without requiring raw artifact inspection.

## 2026-02-24: Persistent Document Stage Diagnostics

- Decision:
  - Persist document upload/extraction timeline events in DB (`document_events`).
  - Expose diagnostics at `GET /documents/:id/events`.
- Why:
  - File logs alone are insufficient for per-user troubleshooting and FE visibility.
  - Durable event trails improve supportability across restarts and environments.

## 2026-02-24: Upload Capability Health Endpoint

- Decision:
  - Add `GET /documents/upload-health` to check bucket access and signed URL generation capability.
- Why:
  - Fast root-cause detection for upload failures (credentials/CORS/signing/storage issues).
  - Enables FE to surface actionable environment diagnostics to users/developers.
